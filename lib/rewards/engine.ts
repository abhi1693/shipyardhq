import crypto from "node:crypto"

import prisma from "@/lib/prisma"
import { publish } from "@/lib/server/events"
import {
  FeatureEntitlementStatus,
  PlacementStatus,
  RewardTransactionType,
  RedemptionStatus,
  RewardFeatureCategory,
  RewardRuleCategory,
  type RewardBalance,
  type RewardCatalogItem,
  type RewardRule,
  Prisma,
} from "@/lib/vendor/prisma/client"

import {
  RewardsCapExceededError,
  RewardsCooldownError,
  RewardsError,
  RewardsInsufficientBalanceError,
  RedemptionLimitError,
  RedemptionValidationError,
  RedemptionNotFoundError,
  RedemptionRefundError,
  RewardRuleInactiveError,
  RewardRuleNotFoundError,
  RewardUnavailableError,
} from "./errors"
import type {
  AdjustRewardsOptions,
  AwardRewardsPayload,
  AwardRewardsResult,
  RedeemOptions,
  RedeemResult,
  StreakPayload,
  RefundRedemptionOptions,
  RefundRedemptionResult,
} from "./types"

const ACTIVE_ENTITLEMENT_STATUSES = [
  FeatureEntitlementStatus.active,
  FeatureEntitlementStatus.pending,
  FeatureEntitlementStatus.paused,
]

const SCHEDULED_REWARD_KEYS = new Set([
  "homepage",
  "stickyBanner",
  "priorityPlacement",
  "newsletterPromotion",
])

const SCHEDULED_SURFACES = new Set(["homepage", "sticky-banner"])
const SCHEDULED_CHANNELS = new Set(["newsletter"])

type TransactionArg = Parameters<typeof prisma.$transaction>[0]
type TxClient = TransactionArg extends (
  arg: infer Client,
  ...rest: any[]
) => any
  ? Client
  : Prisma.TransactionClient

type JsonValue = Prisma.InputJsonValue

function extractMetadataString(
  metadata: JsonValue | null | undefined,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== "object") return null
  if (Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "string" ? value : null
}

function extractSurface(metadata: JsonValue | null | undefined): string | null {
  return extractMetadataString(metadata, "surface")
}

function extractChannel(metadata: JsonValue | null | undefined): string | null {
  return extractMetadataString(metadata, "channel")
}

export function requiresPlacementSchedule(
  catalogItem: RewardCatalogItem,
): boolean {
  if (catalogItem.category === RewardFeatureCategory.placement) {
    return true
  }
  if (SCHEDULED_REWARD_KEYS.has(catalogItem.featureKey)) {
    return true
  }
  const surface = extractSurface(catalogItem.metadata)
  if (surface && SCHEDULED_SURFACES.has(surface)) {
    return true
  }
  const channel = extractChannel(catalogItem.metadata)
  if (channel && SCHEDULED_CHANNELS.has(channel)) {
    return true
  }
  return false
}

/**
 * Awards rewards for a user according to the provided rule key.
 *
 * The operation is idempotent when `payload.eventId` is supplied, since it is
 * hashed into an event signature and the previously created transaction is
 * returned with `created: false` when a duplicate is detected. Reward caps and
 * cooldowns are enforced inside the transaction before the balance is mutated,
 * and the updated balance along with the new transaction is returned to the
 * caller when a new grant is recorded.
 */
export async function awardRewards(
  userId: string,
  ruleKey: string,
  payload: AwardRewardsPayload,
): Promise<AwardRewardsResult> {
  const eventHash = buildEventHash(userId, ruleKey, payload.eventId)
  const now = new Date()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rule = await tx.rewardRule.findUnique({ where: { key: ruleKey } })
      if (!rule) {
        throw new RewardRuleNotFoundError(ruleKey)
      }

      if (!rule.isActive) {
        throw new RewardRuleInactiveError(ruleKey)
      }

      if (eventHash) {
        const existing = await tx.rewardTransaction.findUnique({
          where: { eventHash },
          include: { redemption: true, catalogItem: true },
        })
        if (existing) {
          const balance = await requireBalance(tx, userId)
          return { transaction: existing, balance, rule, created: false }
        }
      }

      const rewardAmount = resolveRewardAmount(rule, payload)
      if (rewardAmount <= 0) {
        throw new RewardsError(
          `Rewards for '${ruleKey}' must be positive`,
          "INVALID_REWARDS",
        )
      }

      const lockedBalance = await lockRewardBalance(tx, userId)

      await enforceCaps(tx, userId, rule, rewardAmount, now)
      await enforceCooldowns(tx, userId, rule, payload, now)

      const streakUpdate = resolveStreak(lockedBalance, payload.streak, now)

      const balance = await tx.rewardBalance.update({
        where: { userId },
        data: {
          balance: { increment: rewardAmount },
          lifetimeEarned: { increment: rewardAmount },
          lastEarnedAt: now,
          lastEvaluatedAt: streakUpdate.lastEvaluatedAt,
          currentStreakCount: streakUpdate.currentStreakCount,
          longestStreakCount: streakUpdate.longestStreakCount,
          currentStreakTier: streakUpdate.currentStreakTier,
          streakActiveThrough: streakUpdate.streakActiveThrough,
        },
      })

      const transaction = await tx.rewardTransaction.create({
        data: {
          userId,
          type: RewardTransactionType.earn,
          rewardAmount,
          balanceAfter: balance.balance,
          ruleId: rule.id,
          ruleKey: rule.key,
          rewardKey: null,
          eventId: payload.eventId ?? null,
          eventHash,
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          targetType: payload.targetType,
          targetId: payload.targetId,
          productId: payload.productId,
          metadata: payload.metadata,
          notes: payload.notes,
          actedByUserId: payload.actorUserId ?? null,
        },
      })

      return { transaction, balance, rule, created: true }
    })

    if (result.created) {
      await publish("rewards.awarded", {
        transactionId: result.transaction.id,
        userId,
        rewardAmount: result.transaction.rewardAmount,
        ruleKey: result.rule.key,
        ruleName: result.rule.name,
        balanceAfter: result.transaction.balanceAfter,
        createdAt: result.transaction.createdAt,
        metadata: result.transaction.metadata,
        sourceType: result.transaction.sourceType,
        sourceId: result.transaction.sourceId,
        targetType: result.transaction.targetType,
        targetId: result.transaction.targetId,
        productId: result.transaction.productId,
      })
    }

    return result
  } catch (error) {
    const recovered = await recoverAwardRewardsFromDuplicate({
      error,
      eventHash,
      userId,
      ruleKey,
    })
    if (recovered) {
      return recovered
    }
    throw error
  }
}

export async function redeem(
  userId: string,
  featureKey: string,
  options: RedeemOptions = {},
): Promise<RedeemResult> {
  const eventHash = buildEventHash(
    userId,
    featureKey,
    options.idempotencyKey,
    "redeem",
  )
  const now = new Date()

  type RedemptionWithCatalog = Prisma.RedemptionGetPayload<{
    include: { catalogItem: true }
  }>

  const result = await prisma.$transaction(async (tx) => {
    const catalogItem = await tx.rewardCatalogItem.findUnique({
      where: { featureKey },
    })
    if (!catalogItem || !catalogItem.isActive) {
      throw new RewardUnavailableError(featureKey)
    }

    if (eventHash) {
      const existing = await tx.rewardTransaction.findUnique({
        where: { eventHash },
        include: {
          redemption: {
            include: {
              catalogItem: true,
              entitlements: { orderBy: { createdAt: "asc" } },
              placementSchedules: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      })
      if (existing?.redemption) {
        const balance = await requireBalance(tx, userId)
        const entitlement = existing.redemption.entitlements[0] ?? null
        const schedule = existing.redemption.placementSchedules[0] ?? null
        return {
          transaction: existing,
          balance,
          redemption: existing.redemption,
          entitlement:
            entitlement ?? (await fetchEntitlement(tx, existing.redemption.id)),
          placementSchedule: schedule,
          catalogItem: existing.redemption.catalogItem,
          created: false,
        }
      }
    }

    if (catalogItem.requiresProduct && !options.productId) {
      throw new RedemptionValidationError(
        `Reward '${featureKey}' requires a product context`,
        featureKey,
      )
    }
    if (
      catalogItem.category === RewardFeatureCategory.placement &&
      !options.productId
    ) {
      throw new RedemptionValidationError(
        `Placement rewards must target a product`,
        featureKey,
      )
    }

    const effectiveCost = resolveRedemptionCost(
      catalogItem.baseCost,
      options.costOverride,
      featureKey,
    )
    const balanceBefore = await tx.rewardBalance.findUnique({
      where: { userId },
    })
    if (!balanceBefore || balanceBefore.balance < effectiveCost) {
      throw new RewardsInsufficientBalanceError(userId, effectiveCost)
    }

    await enforceRedemptionLimits(tx, userId, featureKey, catalogItem)

    const requiresSchedule = requiresPlacementSchedule(catalogItem)
    const autoActivate = options.autoActivate ?? !requiresSchedule
    const startsAt =
      options.reservation?.startsAt ?? (autoActivate ? now : null)
    const durationSeconds = resolveDuration(
      options.reservation?.durationSeconds,
      catalogItem.durationSeconds,
    )
    const expiresAt =
      startsAt && durationSeconds ? addSeconds(startsAt, durationSeconds) : null
    const reservationDetails = serializeReservation(
      options.reservation,
      durationSeconds,
    )
    const reservationMetadata = mergeMetadata(options.metadata, {
      reservation: reservationDetails,
    })
    const updateResult = await tx.rewardBalance.updateMany({
      where: {
        userId,
        balance: { gte: effectiveCost },
      },
      data: {
        balance: { decrement: effectiveCost },
        lifetimeSpent: { increment: effectiveCost },
        lastRedeemedAt: now,
      },
    })
    if (updateResult.count === 0) {
      throw new RewardsInsufficientBalanceError(userId, effectiveCost)
    }

    const updatedBalance = await tx.rewardBalance.findUnique({
      where: { userId },
    })
    if (!updatedBalance) {
      throw new RewardsInsufficientBalanceError(userId, effectiveCost)
    }

    const redemption = (await tx.redemption.create({
      data: {
        userId,
        featureKey,
        productId: options.productId ?? null,
        status: autoActivate
          ? RedemptionStatus.active
          : RedemptionStatus.pending,
        cost: effectiveCost,
        originalCost: catalogItem.baseCost,
        refundedRewards: 0,
        startsAt,
        activatedAt: autoActivate ? startsAt : null,
        expiresAt,
        metadata: reservationMetadata,
        failureReason: null,
      },
      include: { catalogItem: true },
    })) as RedemptionWithCatalog

    const entitlement = await tx.featureEntitlement.create({
      data: {
        userId,
        featureKey,
        redemptionId: redemption.id,
        productId: options.productId ?? null,
        subjectType: options.productId ? "product" : "user",
        subjectId: options.productId ?? userId,
        status: autoActivate
          ? FeatureEntitlementStatus.active
          : FeatureEntitlementStatus.pending,
        startsAt,
        activatedAt: autoActivate ? startsAt : null,
        expiresAt,
        metadata: reservationMetadata,
      },
    })

    let placementSchedule = null
    if (requiresSchedule) {
      if (!options.reservation?.slotKey) {
        throw new RedemptionValidationError(
          `Placement rewards require a slotKey reservation`,
          featureKey,
        )
      }
      if (!startsAt || !expiresAt) {
        throw new RedemptionValidationError(
          `Placement rewards require schedule boundaries`,
          featureKey,
        )
      }
      placementSchedule = await tx.placementSchedule.create({
        data: {
          entitlementId: entitlement.id,
          redemptionId: redemption.id,
          featureKey,
          productId: options.productId!,
          slotKey: options.reservation.slotKey,
          status: autoActivate
            ? PlacementStatus.active
            : PlacementStatus.pending,
          startsAt,
          endsAt: expiresAt,
          metadata: reservationMetadata,
        },
      })
    }

    const transaction = await tx.rewardTransaction.create({
      data: {
        userId,
        type: RewardTransactionType.spend,
        rewardAmount: effectiveCost,
        balanceAfter: updatedBalance.balance,
        rewardKey: featureKey,
        redemptionId: redemption.id,
        productId: options.productId ?? null,
        eventId: options.idempotencyKey ?? null,
        eventHash,
        metadata: options.metadata,
        notes: options.notes,
        actedByUserId: options.actorUserId ?? null,
      },
    })

    return {
      transaction,
      balance: updatedBalance,
      redemption,
      entitlement,
      placementSchedule,
      catalogItem: redemption.catalogItem,
      created: true,
    }
  })

  if (result.created) {
    await publish("rewards.redeemed", {
      transactionId: result.transaction.id,
      userId,
      featureKey,
      redemptionId: result.redemption.id,
      cost: result.transaction.rewardAmount,
      balanceAfter: result.transaction.balanceAfter,
      status: result.redemption.status,
      createdAt: result.transaction.createdAt,
      productId: result.redemption.productId,
      autoActivated: result.redemption.status === RedemptionStatus.active,
      placementScheduleId: result.placementSchedule?.id ?? null,
    })
  }

  return result
}

export async function refundRedemption(
  redemptionId: string,
  options: RefundRedemptionOptions,
): Promise<RefundRedemptionResult> {
  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const redemption = await tx.redemption.findUnique({
      where: { id: redemptionId },
      include: {
        catalogItem: true,
        placementSchedules: {
          select: { id: true, status: true },
        },
        entitlements: {
          select: { id: true, status: true },
        },
      },
    })

    if (!redemption) {
      throw new RedemptionNotFoundError(redemptionId)
    }

    if (redemption.status === RedemptionStatus.refunded) {
      throw new RedemptionRefundError(
        "Redemption has already been fully refunded",
        redemptionId,
      )
    }

    const refundableAmount = redemption.cost - redemption.refundedRewards
    if (refundableAmount <= 0) {
      throw new RedemptionRefundError(
        "No refundable rewards remain for this redemption",
        redemptionId,
      )
    }

    const refundAmount = refundableAmount
    const willBeFullyRefunded =
      redemption.refundedRewards + refundAmount >= redemption.cost
    const shouldRevert = options.revertPerk ?? willBeFullyRefunded

    const eventHash = buildEventHash(
      redemption.userId,
      redemption.id,
      options.idempotencyKey,
      "refund",
    )

    if (eventHash) {
      const existing = await tx.rewardTransaction.findUnique({
        where: { eventHash },
        include: { redemption: true },
      })
      if (existing) {
        const balance = await requireBalance(tx, redemption.userId)
        return {
          transaction: existing,
          redemption: existing.redemption ?? redemption,
          balance,
          refundedAmount: existing.rewardAmount,
          fullyRefunded:
            (existing.redemption?.status ?? redemption.status) ===
              RedemptionStatus.refunded ||
            redemption.refundedRewards + existing.rewardAmount >=
              redemption.cost,
        }
      }
    }

    await lockRewardBalance(tx, redemption.userId)

    if (shouldRevert) {
      if (redemption.entitlements.length > 0) {
        await tx.featureEntitlement.updateMany({
          where: { redemptionId },
          data: {
            status: FeatureEntitlementStatus.canceled,
            deactivatedAt: now,
            expiresAt: now,
          },
        })
      }

      if (redemption.placementSchedules.length > 0) {
        await tx.placementSchedule.updateMany({
          where: { redemptionId },
          data: {
            status: PlacementStatus.canceled,
            endsAt: now,
          },
        })
      }
    }

    const updatedBalance = await tx.rewardBalance.update({
      where: { userId: redemption.userId },
      data: {
        balance: { increment: refundAmount },
        lifetimeRefunded: { increment: refundAmount },
      },
    })

    const updatedRedemption = await tx.redemption.update({
      where: { id: redemptionId },
      data: {
        refundedRewards: { increment: refundAmount },
        status: willBeFullyRefunded
          ? RedemptionStatus.refunded
          : redemption.status,
        canceledAt: shouldRevert ? now : redemption.canceledAt,
      },
    })

    const transactionMetadata = mergeMetadata(options.metadata, {
      reference: options.reference,
      reason: options.reason,
    })

    const transaction = await tx.rewardTransaction.create({
      data: {
        userId: redemption.userId,
        type: RewardTransactionType.refund,
        rewardAmount: refundAmount,
        balanceAfter: updatedBalance.balance,
        rewardKey: redemption.featureKey,
        redemptionId: redemption.id,
        productId: redemption.productId,
        eventId: options.idempotencyKey ?? null,
        eventHash,
        notes: options.notes ?? options.reason,
        metadata: transactionMetadata,
        actedByUserId: options.actorUserId,
      },
    })

    return {
      transaction,
      redemption: updatedRedemption,
      balance: updatedBalance,
      refundedAmount: refundAmount,
      fullyRefunded: willBeFullyRefunded,
    }
  })

  await publish("rewards.refunded", {
    transactionId: result.transaction.id,
    redemptionId,
    userId: result.transaction.userId,
    featureKey: result.transaction.rewardKey ?? null,
    amount: result.transaction.rewardAmount,
    balanceAfter: result.transaction.balanceAfter,
    createdAt: result.transaction.createdAt,
    fullyRefunded: result.fullyRefunded,
    productId: result.transaction.productId ?? null,
    actorUserId: result.transaction.actedByUserId ?? null,
  })

  return result
}

export async function adjustRewards(
  userId: string,
  amount: number,
  options: AdjustRewardsOptions,
): Promise<AwardRewardsResult> {
  if (amount === 0) {
    throw new RedemptionValidationError(
      "Adjustment amount must be non-zero",
      "adjustment",
    )
  }
  const now = new Date()
  const eventHash = buildEventHash(userId, "adjust", options.eventId, "adjust")

  const result = await prisma.$transaction(async (tx) => {
    if (eventHash) {
      const existing = await tx.rewardTransaction.findUnique({
        where: { eventHash },
        include: { redemption: true, catalogItem: true, rule: true },
      })
      if (existing) {
        const balance = await requireBalance(tx, userId)
        return {
          transaction: existing,
          balance,
          rule: existing.rule ?? createSyntheticRule(amount),
          created: false,
        }
      }
    }

    const balanceBefore = await tx.rewardBalance.findUnique({
      where: { userId },
    })
    if (amount < 0) {
      const needs = Math.abs(amount)
      const available = balanceBefore?.balance ?? 0
      if (available < needs) {
        throw new RewardsInsufficientBalanceError(userId, needs)
      }
    }
    const balance = balanceBefore
      ? await tx.rewardBalance.update({
          where: { userId },
          data: {
            balance:
              amount > 0
                ? { increment: amount }
                : { decrement: Math.abs(amount) },
            lifetimeAdjusted:
              amount > 0
                ? { increment: amount }
                : { increment: Math.abs(amount) },
            lastAdjustmentAt: now,
          },
        })
      : await tx.rewardBalance.create({
          data: {
            userId,
            balance: Math.max(amount, 0),
            lifetimeAdjusted: Math.abs(amount),
            lastAdjustmentAt: now,
          },
        })

    const transaction = await tx.rewardTransaction.create({
      data: {
        userId,
        type: RewardTransactionType.adjustment,
        rewardAmount: Math.abs(amount),
        balanceAfter: balance.balance,
        eventId: options.eventId ?? null,
        eventHash,
        metadata: options.metadata,
        notes: options.notes,
        actedByUserId: options.actorUserId,
      },
    })

    return {
      transaction,
      balance,
      rule: createSyntheticRule(amount),
      created: true,
    }
  })

  if (result.created) {
    await publish("rewards.adjusted", {
      transactionId: result.transaction.id,
      userId,
      amount,
      balanceAfter: result.transaction.balanceAfter,
      createdAt: result.transaction.createdAt,
      actorUserId: result.transaction.actedByUserId,
      metadata: result.transaction.metadata,
      notes: result.transaction.notes,
    })
  }

  return result
}

async function enforceCaps(
  tx: TxClient,
  userId: string,
  rule: RewardRule,
  incomingRewardAmount: number,
  now: Date,
) {
  if (rule.dailyCap != null) {
    const startOfDay = startOfUtcDay(now)
    const dailySum = await tx.rewardTransaction.aggregate({
      where: {
        userId,
        ruleKey: rule.key,
        type: RewardTransactionType.earn,
        createdAt: { gte: startOfDay },
      },
      _sum: { rewardAmount: true },
    })
    const used = dailySum._sum.rewardAmount ?? 0
    if (used + incomingRewardAmount > rule.dailyCap) {
      throw new RewardsCapExceededError(rule.key, "daily")
    }
  }

  if (rule.lifetimeCap != null) {
    const lifetime = await tx.rewardTransaction.aggregate({
      where: {
        userId,
        ruleKey: rule.key,
        type: RewardTransactionType.earn,
      },
      _sum: { rewardAmount: true },
    })
    const used = lifetime._sum.rewardAmount ?? 0
    if (used + incomingRewardAmount > rule.lifetimeCap) {
      throw new RewardsCapExceededError(rule.key, "lifetime")
    }
  }
}

async function enforceCooldowns(
  tx: TxClient,
  userId: string,
  rule: RewardRule,
  payload: AwardRewardsPayload,
  now: Date,
) {
  if (rule.globalCooldownSeconds != null) {
    const threshold = new Date(
      now.getTime() - rule.globalCooldownSeconds * 1000,
    )
    const recent = await tx.rewardTransaction.findFirst({
      where: {
        userId,
        ruleKey: rule.key,
        type: RewardTransactionType.earn,
        createdAt: { gte: threshold },
      },
      orderBy: { createdAt: "desc" },
    })
    if (recent) {
      throw new RewardsCooldownError(rule.key, "global")
    }
  }

  if (rule.perTargetCooldownSeconds != null && payload.targetId) {
    const threshold = new Date(
      now.getTime() - rule.perTargetCooldownSeconds * 1000,
    )
    const recentTarget = await tx.rewardTransaction.findFirst({
      where: {
        userId,
        ruleKey: rule.key,
        type: RewardTransactionType.earn,
        targetId: payload.targetId,
        createdAt: { gte: threshold },
      },
      orderBy: { createdAt: "desc" },
    })
    if (recentTarget) {
      throw new RewardsCooldownError(rule.key, "target")
    }
  }
}

async function enforceRedemptionLimits(
  tx: TxClient,
  userId: string,
  featureKey: string,
  catalogItem: {
    maxActivePerUser: number | null
    maxPendingPerUser: number | null
  },
) {
  if (catalogItem.maxActivePerUser != null) {
    const activeCount = await tx.featureEntitlement.count({
      where: {
        userId,
        featureKey,
        status: { in: ACTIVE_ENTITLEMENT_STATUSES },
      },
    })
    if (activeCount >= catalogItem.maxActivePerUser) {
      throw new RedemptionLimitError(featureKey, "active")
    }
  }

  if (catalogItem.maxPendingPerUser != null) {
    const pendingCount = await tx.redemption.count({
      where: {
        userId,
        featureKey,
        status: RedemptionStatus.pending,
      },
    })
    if (pendingCount >= catalogItem.maxPendingPerUser) {
      throw new RedemptionLimitError(featureKey, "pending")
    }
  }
}

function resolveRewardAmount(
  rule: RewardRule,
  payload: AwardRewardsPayload,
): number {
  if (typeof payload.amount === "number") {
    return Math.max(0, Math.round(payload.amount))
  }
  const multiplier =
    typeof payload.multiplier === "number" ? payload.multiplier : 1
  return Math.max(0, Math.round(rule.baseRewardAmount * multiplier))
}

function resolveStreak(
  balance: RewardBalance | null,
  streak: StreakPayload | undefined,
  now: Date,
) {
  if (!streak) {
    return {
      currentStreakCount: balance?.currentStreakCount ?? 0,
      longestStreakCount: balance?.longestStreakCount ?? 0,
      currentStreakTier: balance?.currentStreakTier ?? null,
      streakActiveThrough: balance?.streakActiveThrough ?? null,
      lastEvaluatedAt: balance?.lastEvaluatedAt ?? now,
    }
  }

  const currentCount = streak.count
  const longest = Math.max(
    streak.longest ?? currentCount,
    balance?.longestStreakCount ?? 0,
  )

  return {
    currentStreakCount: currentCount,
    longestStreakCount: longest,
    currentStreakTier: streak.tier ?? balance?.currentStreakTier ?? null,
    streakActiveThrough:
      streak.activeThrough ?? balance?.streakActiveThrough ?? null,
    lastEvaluatedAt: streak.evaluatedAt ?? now,
  }
}

function resolveRedemptionCost(
  baseCost: number,
  override: number | undefined,
  featureKey: string,
): number {
  if (override == null) {
    return baseCost
  }
  const value = Math.round(override)
  if (value <= 0) {
    throw new RedemptionValidationError(
      "Cost override must be positive",
      featureKey,
    )
  }
  return value
}

function resolveDuration(
  override: number | undefined,
  fromCatalog: number | null,
): number | null {
  if (typeof override === "number") {
    const overrideValue = Number(override)
    if (!Number.isFinite(overrideValue) || overrideValue <= 0) {
      throw new RedemptionValidationError(
        "Duration must be positive",
        "duration",
      )
    }
    return overrideValue
  }
  return fromCatalog ?? null
}

function serializeReservation(
  reservation: RedeemOptions["reservation"],
  durationSeconds: number | null,
) {
  if (!reservation && durationSeconds == null) return undefined

  const result: Record<string, unknown> = {}
  if (reservation?.slotKey) result.slotKey = reservation.slotKey
  if (reservation?.startsAt) result.startsAt = reservation.startsAt
  if (durationSeconds != null) result.durationSeconds = durationSeconds

  return Object.keys(result).length ? result : undefined
}

function addSeconds(start: Date, seconds: number): Date {
  return new Date(start.getTime() + seconds * 1000)
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

async function lockRewardBalance(
  tx: TxClient,
  userId: string,
): Promise<RewardBalance> {
  await tx.$executeRaw`
    INSERT INTO "RewardBalance" ("userId", "updatedAt")
    VALUES (${userId}, NOW())
    ON CONFLICT ("userId") DO NOTHING
  `

  const balances = await tx.$queryRaw<RewardBalance[]>`
    SELECT *
    FROM "RewardBalance"
    WHERE "userId" = ${userId}
    FOR UPDATE
  `

  const balance = balances[0]
  if (!balance) {
    throw new RewardsError(
      `Failed to lock reward balance for user '${userId}'`,
      "BALANCE_LOCK_FAILED",
    )
  }

  return balance
}

async function requireBalance(tx: TxClient, userId: string) {
  const balance = await tx.rewardBalance.findUnique({ where: { userId } })
  if (!balance) {
    return await tx.rewardBalance.create({ data: { userId } })
  }
  return balance
}

async function fetchEntitlement(tx: TxClient, redemptionId: string) {
  const entitlement = await tx.featureEntitlement.findFirst({
    where: { redemptionId },
    orderBy: { createdAt: "asc" },
  })
  if (!entitlement) {
    throw new RedemptionValidationError(
      "Missing entitlement for redemption",
      redemptionId,
    )
  }
  return entitlement
}

function mergeMetadata(
  base: JsonValue | undefined,
  extra: Record<string, unknown>,
) {
  const sanitizedExtra = Object.fromEntries(
    Object.entries(extra).filter(([, value]) => value !== undefined),
  )
  if (!base && Object.keys(sanitizedExtra).length === 0) return undefined
  if (base && typeof base === "object" && !Array.isArray(base)) {
    return { ...(base as Record<string, unknown>), ...sanitizedExtra }
  }
  if (Object.keys(sanitizedExtra).length === 0) {
    return base
  }
  return { base, ...sanitizedExtra }
}

function buildEventHash(
  userId: string,
  key: string,
  eventId?: string,
  prefix: string = "rule",
) {
  if (!eventId) return null
  return crypto
    .createHash("sha256")
    .update([prefix, userId, key, eventId].join(":"))
    .digest("hex")
}

function createSyntheticRule(amount: number): RewardRule {
  return {
    id: "synthetic-adjustment",
    key: "adjustment",
    name: "Manual Adjustment",
    description: null,
    category: RewardRuleCategory.admin,
    baseRewardAmount: Math.round(Math.abs(amount)),
    isActive: true,
    dailyCap: null,
    lifetimeCap: null,
    globalCooldownSeconds: null,
    perTargetCooldownSeconds: null,
    metadata: null,
    tierConfig: null,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

type AwardRewardsRecoveryArgs = {
  error: unknown
  eventHash: string | null
  userId: string
  ruleKey: string
}

async function recoverAwardRewardsFromDuplicate({
  error,
  eventHash,
  userId,
  ruleKey,
}: AwardRewardsRecoveryArgs): Promise<AwardRewardsResult | null> {
  if (!eventHash || !isRecoverableTransactionError(error)) {
    return null
  }

  try {
    const [transaction, rule] = await Promise.all([
      prisma.rewardTransaction.findUnique({ where: { eventHash } }),
      prisma.rewardRule.findUnique({ where: { key: ruleKey } }),
    ])

    if (!transaction || !rule) {
      return null
    }

    const balance = await prisma.rewardBalance.findUnique({ where: { userId } })
    if (!balance) {
      return null
    }

    return { transaction, balance, rule, created: false }
  } catch (recoveryError) {
    console.error("[rewards] Failed to recover duplicate award result", {
      error: recoveryError,
      originalError: error,
      eventHash,
    })
    return null
  }
}

function isRecoverableTransactionError(error: unknown): boolean {
  if (!error) return false
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  ) {
    return true
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return (
      error.message.includes("eventHash") ||
      error.message.includes("transaction is aborted")
    )
  }
  return false
}
