import prisma from "@/lib/prisma"
import {
  revalidateBadges,
  revalidatePlacement,
  revalidateProduct,
} from "@/lib/cache/revalidate"
import {
  FeatureEntitlementStatus,
  PlacementStatus,
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

  await prisma.$transaction(async (tx) => {
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
        const existingBadge = await tx.productBadge.findFirst({
          where: { productId: schedule.productId, badge },
        })

        if (existingBadge) {
          await tx.productBadge.update({
            where: { id: existingBadge.id },
            data: {
              expiresAt: schedule.endsAt ?? existingBadge.expiresAt ?? null,
            },
          })
        } else {
          await tx.productBadge.create({
            data: {
              productId: schedule.productId,
              badge,
              expiresAt: schedule.endsAt ?? null,
            },
          })
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
        const existingBadge = await tx.productBadge.findFirst({
          where: { productId: schedule.productId, badge },
        })

        if (existingBadge) {
          await tx.productBadge.update({
            where: { id: existingBadge.id },
            data: { expiresAt: schedule.endsAt ?? now },
          })
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
    revalidateProduct(productId)
  }
  for (const productId of expiredProductIds) {
    revalidateProduct(productId)
  }
  if (badgesTouched) {
    revalidateBadges()
  }
  for (const featureKey of touchedFeatures) {
    revalidatePlacement(featureKey)
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
