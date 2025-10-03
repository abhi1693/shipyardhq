import crypto from "node:crypto"

import prisma from "@/lib/prisma"
import { publish } from "@/lib/server/events"
import {
  FeatureEntitlementStatus,
  PlacementStatus,
  PointTransactionType,
  RedemptionStatus,
  RewardFeatureCategory,
  RewardRuleCategory,
  type PointBalance,
  type RewardCatalogItem,
  type RewardRule,
  Prisma,
} from "@/lib/vendor/prisma/client"

import {
  PointsCapExceededError,
  PointsCooldownError,
  PointsError,
  PointsInsufficientBalanceError,
  RedemptionLimitError,
  RedemptionValidationError,
  RewardRuleInactiveError,
  RewardRuleNotFoundError,
  RewardUnavailableError,
} from "./errors"
import type {
  AdjustPointsOptions,
  AwardPointsPayload,
  AwardPointsResult,
  RedeemOptions,
  RedeemResult,
  StreakPayload,
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
type TxClient = TransactionArg extends (arg: infer Client, ...rest: any[]) => any
  ? Client
  : Prisma.TransactionClient

type JsonValue = Prisma.InputJsonValue

function extractMetadataString(
  metadata: JsonValue | null | undefined,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== "object") return null
  if (metadata === Prisma.JsonNull) return null
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

export function requiresPlacementSchedule(catalogItem: RewardCatalogItem): boolean {
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

export async function awardPoints(
  userId: string,
  ruleKey: string,
  payload: AwardPointsPayload,
): Promise<AwardPointsResult> {
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
      const existing = await tx.pointTransaction.findUnique({
        where: { eventHash },
        include: { redemption: true, catalogItem: true },
      })
      if (existing) {
        const balance = await requireBalance(tx, userId)
        return { transaction: existing, balance, rule, created: false }
      }
    }

    const points = resolvePointValue(rule, payload)
    if (points <= 0) {
      throw new PointsError(`Points for '${ruleKey}' must be positive`, "INVALID_POINTS")
    }

    await enforceCaps(tx, userId, rule, points, now)
    await enforceCooldowns(tx, userId, rule, payload, now)

    const existingBalance = await tx.pointBalance.findUnique({ where: { userId } })
    const streakUpdate = resolveStreak(existingBalance, payload.streak, now)

    const balance = existingBalance
      ? await tx.pointBalance.update({
          where: { userId },
          data: {
            balance: { increment: points },
            lifetimeEarned: { increment: points },
            lastEarnedAt: now,
            lastEvaluatedAt: streakUpdate.lastEvaluatedAt,
            currentStreakCount: streakUpdate.currentStreakCount,
            longestStreakCount: streakUpdate.longestStreakCount,
            currentStreakTier: streakUpdate.currentStreakTier,
            streakActiveThrough: streakUpdate.streakActiveThrough,
          },
        })
      : await tx.pointBalance.create({
          data: {
            userId,
            balance: points,
            lifetimeEarned: points,
            lastEarnedAt: now,
            lastEvaluatedAt: streakUpdate.lastEvaluatedAt,
            currentStreakCount: streakUpdate.currentStreakCount,
            longestStreakCount: streakUpdate.longestStreakCount,
            currentStreakTier: streakUpdate.currentStreakTier,
            streakActiveThrough: streakUpdate.streakActiveThrough,
          },
        })

    const transaction = await tx.pointTransaction.create({
      data: {
        userId,
        type: PointTransactionType.earn,
        points,
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
      await publish("points.awarded", {
        transactionId: result.transaction.id,
        userId,
        points: result.transaction.points,
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
    const recovered = await recoverAwardPointsFromDuplicate({
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
  const eventHash = buildEventHash(userId, featureKey, options.idempotencyKey, "redeem")
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
      const existing = await tx.pointTransaction.findUnique({
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
          entitlement: entitlement ?? (await fetchEntitlement(tx, existing.redemption.id)),
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
    if (catalogItem.category === RewardFeatureCategory.placement && !options.productId) {
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
    const balanceBefore = await requireBalance(tx, userId)
    if (balanceBefore.balance < effectiveCost) {
      throw new PointsInsufficientBalanceError(userId, effectiveCost)
    }

    await enforceRedemptionLimits(tx, userId, featureKey, catalogItem)

    const requiresSchedule = requiresPlacementSchedule(catalogItem)
    const autoActivate = options.autoActivate ?? !requiresSchedule
    const startsAt = options.reservation?.startsAt ?? (autoActivate ? now : null)
    const durationSeconds = resolveDuration(options.reservation?.durationSeconds, catalogItem.durationSeconds)
    const expiresAt = startsAt && durationSeconds ? addSeconds(startsAt, durationSeconds) : null

    const updatedBalance = await tx.pointBalance.update({
      where: { userId },
      data: {
        balance: { decrement: effectiveCost },
        lifetimeSpent: { increment: effectiveCost },
        lastRedeemedAt: now,
      },
    })

    const redemption = (await tx.redemption.create({
      data: {
        userId,
        featureKey,
        productId: options.productId ?? null,
        status: autoActivate ? RedemptionStatus.active : RedemptionStatus.pending,
        cost: effectiveCost,
        originalCost: catalogItem.baseCost,
        refundedPoints: 0,
        startsAt,
        activatedAt: autoActivate ? startsAt : null,
        expiresAt,
        metadata: mergeMetadata(options.metadata, {
          reservation: serializeReservation(options.reservation, durationSeconds),
        }),
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
        metadata: mergeMetadata(options.metadata, {
          reservation: serializeReservation(options.reservation, durationSeconds),
        }),
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
          status: autoActivate ? PlacementStatus.active : PlacementStatus.pending,
          startsAt,
          endsAt: expiresAt,
          metadata: mergeMetadata(options.metadata, {
            reservation: serializeReservation(options.reservation, durationSeconds),
          }),
        },
      })
    }

    const transaction = await tx.pointTransaction.create({
      data: {
        userId,
        type: PointTransactionType.spend,
        points: effectiveCost,
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
    await publish("points.redeemed", {
      transactionId: result.transaction.id,
      userId,
      featureKey,
      redemptionId: result.redemption.id,
      cost: result.transaction.points,
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

export async function adjustPoints(
  userId: string,
  amount: number,
  options: AdjustPointsOptions,
): Promise<AwardPointsResult> {
  if (amount === 0) {
    throw new RedemptionValidationError("Adjustment amount must be non-zero", "adjustment")
  }
  const now = new Date()
  const eventHash = buildEventHash(userId, "adjust", options.eventId, "adjust")

  const result = await prisma.$transaction(async (tx) => {
    if (eventHash) {
      const existing = await tx.pointTransaction.findUnique({
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

    const balanceBefore = await tx.pointBalance.findUnique({ where: { userId } })
    if (amount < 0) {
      const needs = Math.abs(amount)
      const available = balanceBefore?.balance ?? 0
      if (available < needs) {
        throw new PointsInsufficientBalanceError(userId, needs)
      }
    }
    const balance = balanceBefore
      ? await tx.pointBalance.update({
          where: { userId },
          data: {
            balance: amount > 0 ? { increment: amount } : { decrement: Math.abs(amount) },
            lifetimeAdjusted:
              amount > 0
                ? { increment: amount }
                : { increment: Math.abs(amount) },
            lastAdjustmentAt: now,
          },
        })
      : await tx.pointBalance.create({
          data: {
            userId,
            balance: Math.max(amount, 0),
            lifetimeAdjusted: Math.abs(amount),
            lastAdjustmentAt: now,
          },
        })

    const transaction = await tx.pointTransaction.create({
      data: {
        userId,
        type: PointTransactionType.adjustment,
        points: Math.abs(amount),
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
    await publish("points.adjusted", {
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
  incomingPoints: number,
  now: Date,
) {
  if (rule.dailyCap != null) {
    const startOfDay = startOfUtcDay(now)
    const dailySum = await tx.pointTransaction.aggregate({
      where: {
        userId,
        ruleKey: rule.key,
        type: PointTransactionType.earn,
        createdAt: { gte: startOfDay },
      },
      _sum: { points: true },
    })
    const used = dailySum._sum.points ?? 0
    if (used + incomingPoints > rule.dailyCap) {
      throw new PointsCapExceededError(rule.key, "daily")
    }
  }

  if (rule.lifetimeCap != null) {
    const lifetime = await tx.pointTransaction.aggregate({
      where: {
        userId,
        ruleKey: rule.key,
        type: PointTransactionType.earn,
      },
      _sum: { points: true },
    })
    const used = lifetime._sum.points ?? 0
    if (used + incomingPoints > rule.lifetimeCap) {
      throw new PointsCapExceededError(rule.key, "lifetime")
    }
  }
}

async function enforceCooldowns(
  tx: TxClient,
  userId: string,
  rule: RewardRule,
  payload: AwardPointsPayload,
  now: Date,
) {
  if (rule.globalCooldownSeconds != null) {
    const threshold = new Date(now.getTime() - rule.globalCooldownSeconds * 1000)
    const recent = await tx.pointTransaction.findFirst({
      where: {
        userId,
        ruleKey: rule.key,
        type: PointTransactionType.earn,
        createdAt: { gte: threshold },
      },
      orderBy: { createdAt: "desc" },
    })
    if (recent) {
      throw new PointsCooldownError(rule.key, "global")
    }
  }

  if (rule.perTargetCooldownSeconds != null && payload.targetId) {
    const threshold = new Date(now.getTime() - rule.perTargetCooldownSeconds * 1000)
    const recentTarget = await tx.pointTransaction.findFirst({
      where: {
        userId,
        ruleKey: rule.key,
        type: PointTransactionType.earn,
        targetId: payload.targetId,
        createdAt: { gte: threshold },
      },
      orderBy: { createdAt: "desc" },
    })
    if (recentTarget) {
      throw new PointsCooldownError(rule.key, "target")
    }
  }
}

async function enforceRedemptionLimits(
  tx: TxClient,
  userId: string,
  featureKey: string,
  catalogItem: { maxActivePerUser: number | null; maxPendingPerUser: number | null },
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

function resolvePointValue(rule: RewardRule, payload: AwardPointsPayload): number {
  if (typeof payload.points === "number") {
    return Math.max(0, Math.round(payload.points))
  }
  const multiplier = typeof payload.multiplier === "number" ? payload.multiplier : 1
  return Math.max(0, Math.round(rule.basePoints * multiplier))
}

function resolveStreak(
  balance: PointBalance | null,
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
    streakActiveThrough: streak.activeThrough ?? balance?.streakActiveThrough ?? null,
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
    if (override <= 0) {
      throw new RedemptionValidationError("Duration must be positive", "duration")
    }
    return override
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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

async function requireBalance(tx: TxClient, userId: string) {
  const balance = await tx.pointBalance.findUnique({ where: { userId } })
  if (!balance) {
    return await tx.pointBalance.create({ data: { userId } })
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

function mergeMetadata(base: JsonValue | undefined, extra: Record<string, unknown>) {
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
    basePoints: Math.round(Math.abs(amount)),
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

type AwardPointsRecoveryArgs = {
  error: unknown
  eventHash: string | null
  userId: string
  ruleKey: string
}

async function recoverAwardPointsFromDuplicate({
  error,
  eventHash,
  userId,
  ruleKey,
}: AwardPointsRecoveryArgs): Promise<AwardPointsResult | null> {
  if (!eventHash || !isRecoverableTransactionError(error)) {
    return null
  }

  try {
    const [transaction, rule] = await Promise.all([
      prisma.pointTransaction.findUnique({ where: { eventHash } }),
      prisma.rewardRule.findUnique({ where: { key: ruleKey } }),
    ])

    if (!transaction || !rule) {
      return null
    }

    const balance = await prisma.pointBalance.findUnique({ where: { userId } })
    if (!balance) {
      return null
    }

    return { transaction, balance, rule, created: false }
  } catch (recoveryError) {
    console.error("[points] Failed to recover duplicate award result", {
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
