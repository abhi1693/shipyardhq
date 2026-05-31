import prisma from "@/lib/prisma"
import {
  revalidateBadges,
  revalidatePlacement,
  revalidateProduct,
} from "@/lib/cache/revalidate"
import {
  FeatureEntitlementStatus,
  PlacementStatus,
  Prisma,
  RedemptionStatus,
} from "@/lib/vendor/prisma/client"

export type PlacementSchedulerResult = {
  activated: number
  expired: number
  activatedProductIds: string[]
  expiredProductIds: string[]
  badgesActivated: number
  badgesExpired: number
}

const FEATURE_BADGE_MAP: Record<string, string> = {
  featured: "featured",
}

export async function runPlacementScheduler(
  now: Date = new Date(),
): Promise<PlacementSchedulerResult> {
  const activatedProductIds = new Set<string>()
  const expiredProductIds = new Set<string>()
  let activated = 0
  let expired = 0
  let badgesActivated = 0
  let badgesExpired = 0
  let badgesTouched = false
  const touchedFeatures = new Set<string>()

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    type BadgeTarget = { productId: string; badge: string }
    type BadgeRecord = {
      id: string
      productId: string
      badge: string
      expiresAt: Date | null
    }

    const badgeKeyFor = (productId: string, badge: string) =>
      `${productId}:${badge}`

    const collectBadgeTargets = (
      schedules: Array<{ productId: string; featureKey: string }>,
    ): BadgeTarget[] => {
      const seen = new Set<string>()
      const targets: BadgeTarget[] = []
      for (const schedule of schedules) {
        const badge = FEATURE_BADGE_MAP[schedule.featureKey]
        if (!badge) continue
        const key = badgeKeyFor(schedule.productId, badge)
        if (seen.has(key)) continue
        seen.add(key)
        targets.push({ productId: schedule.productId, badge })
      }
      return targets
    }

    const loadBadgeMap = async (
      targets: BadgeTarget[],
    ): Promise<Map<string, BadgeRecord>> => {
      if (!targets.length) {
        return new Map<string, BadgeRecord>()
      }
      const existing = await tx.productBadge.findMany({
        where: {
          OR: targets.map(({ productId, badge }) => ({ productId, badge })),
        },
        select: {
          id: true,
          productId: true,
          badge: true,
          expiresAt: true,
        },
      })
      const map = new Map<string, BadgeRecord>()
      for (const record of existing) {
        map.set(badgeKeyFor(record.productId, record.badge), record)
      }
      return map
    }

    const pendingSchedules = await tx.placementSchedule.findMany({
      where: {
        status: PlacementStatus.pending,
        startsAt: { lte: now },
      },
      select: {
        id: true,
        entitlementId: true,
        redemptionId: true,
        productId: true,
        startsAt: true,
        endsAt: true,
        featureKey: true,
      },
    })

    const pendingBadgeTargets = collectBadgeTargets(pendingSchedules)
    const pendingBadges = await loadBadgeMap(pendingBadgeTargets)

    for (const schedule of pendingSchedules) {
      await tx.placementSchedule.update({
        where: { id: schedule.id },
        data: { status: PlacementStatus.active },
      })

      await tx.featureEntitlement.update({
        where: { id: schedule.entitlementId },
        data: {
          status: FeatureEntitlementStatus.active,
          activatedAt: schedule.startsAt ?? now,
        },
      })

      if (schedule.redemptionId) {
        await tx.redemption.update({
          where: { id: schedule.redemptionId },
          data: {
            status: RedemptionStatus.active,
            activatedAt: schedule.startsAt ?? now,
          },
        })
      }

      const badge = FEATURE_BADGE_MAP[schedule.featureKey]
      if (badge) {
        const key = badgeKeyFor(schedule.productId, badge)
        const existingBadge = pendingBadges.get(key)

        if (existingBadge) {
          const updatedBadge = await tx.productBadge.update({
            where: { id: existingBadge.id },
            data: {
              expiresAt: schedule.endsAt ?? existingBadge.expiresAt ?? null,
            },
            select: {
              id: true,
              productId: true,
              badge: true,
              expiresAt: true,
            },
          })
          pendingBadges.set(key, updatedBadge)
        } else {
          const createdBadge = await tx.productBadge.create({
            data: {
              productId: schedule.productId,
              badge,
              expiresAt: schedule.endsAt ?? null,
            },
            select: {
              id: true,
              productId: true,
              badge: true,
              expiresAt: true,
            },
          })
          pendingBadges.set(key, createdBadge)
        }

        badgesActivated += 1
        badgesTouched = true
      }

      activatedProductIds.add(schedule.productId)
      activated += 1
      touchedFeatures.add(schedule.featureKey)
    }

    const endingSchedules = await tx.placementSchedule.findMany({
      where: {
        status: PlacementStatus.active,
        endsAt: { lte: now },
      },
      select: {
        id: true,
        entitlementId: true,
        redemptionId: true,
        productId: true,
        endsAt: true,
        featureKey: true,
      },
    })

    const endingBadgeTargets = collectBadgeTargets(endingSchedules)
    const endingBadges = await loadBadgeMap(endingBadgeTargets)

    for (const schedule of endingSchedules) {
      await tx.placementSchedule.update({
        where: { id: schedule.id },
        data: { status: PlacementStatus.completed },
      })

      await tx.featureEntitlement.update({
        where: { id: schedule.entitlementId },
        data: {
          status: FeatureEntitlementStatus.expired,
          expiresAt: schedule.endsAt ?? now,
        },
      })

      if (schedule.redemptionId) {
        await tx.redemption.update({
          where: { id: schedule.redemptionId },
          data: {
            status: RedemptionStatus.expired,
            expiresAt: schedule.endsAt ?? now,
          },
        })
      }

      const badge = FEATURE_BADGE_MAP[schedule.featureKey]
      if (badge) {
        const key = badgeKeyFor(schedule.productId, badge)
        const existingBadge = endingBadges.get(key)

        if (existingBadge) {
          const updatedBadge = await tx.productBadge.update({
            where: { id: existingBadge.id },
            data: { expiresAt: schedule.endsAt ?? now },
            select: {
              id: true,
              productId: true,
              badge: true,
              expiresAt: true,
            },
          })
          endingBadges.set(key, updatedBadge)
          badgesExpired += 1
          badgesTouched = true
        }
      }

      expiredProductIds.add(schedule.productId)
      expired += 1
      touchedFeatures.add(schedule.featureKey)
    }
  })

  for (const productId of activatedProductIds) {
    revalidateProduct(productId, "revalidate")
  }
  for (const productId of expiredProductIds) {
    revalidateProduct(productId, "revalidate")
  }
  if (badgesTouched) {
    revalidateBadges("revalidate")
  }
  for (const featureKey of touchedFeatures) {
    revalidatePlacement(featureKey, "revalidate")
  }

  return {
    activated,
    expired,
    activatedProductIds: Array.from(activatedProductIds),
    expiredProductIds: Array.from(expiredProductIds),
    badgesActivated,
    badgesExpired,
  }
}
