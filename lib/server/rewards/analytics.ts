import { addDays, format, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { RewardTransactionType, type Prisma } from "@/lib/vendor/prisma/client"
import type {
  RewardAnalyticsLeaderboardEntry,
  RewardAnalyticsSummary,
  RewardAnalyticsTimelinePoint,
  RewardAnalyticsUserEntry,
} from "@/types/rewards"

const TIMELINE_LABEL_FORMAT = "MMM d"

function calcChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0
    return current > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
  }
  return ((current - previous) / previous) * 100
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractAdjustmentSignedAmount(
  rewardAmount: number,
  metadata: Prisma.JsonValue | null | undefined,
): number {
  if (!metadata || !isRecord(metadata)) {
    return rewardAmount
  }
  const rawAdjustment = metadata.adjustment
  if (!isRecord(rawAdjustment)) {
    return rewardAmount
  }
  const rawAmount = rawAdjustment.amount
  if (typeof rawAmount === "number" && Number.isFinite(rawAmount)) {
    return rawAmount
  }
  if (typeof rawAmount === "string") {
    const parsed = Number(rawAmount)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return rewardAmount
}

type TimelineAccumulator = {
  date: string
  label: string
  earn: number
  spend: number
  adjustment: number
  refund: number
  netAdjustment: number
}

function normaliseAmount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

interface GroupRow {
  ruleKey?: string | null
  rewardKey?: string | null
  userId?: string
  _sum: { rewardAmount: number | null }
  _count: { _all: number }
}

export async function getRewardAnalytics(
  rangeDays = 30,
): Promise<RewardAnalyticsSummary> {
  const today = startOfDay(new Date())
  const windowDays = Math.max(rangeDays, 1)
  const currentStart = subDays(today, windowDays - 1)
  const currentEnd = addDays(today, 1)
  const previousStart = subDays(currentStart, windowDays)
  const previousEnd = currentStart

  const [
    currentTransactions,
    previousTransactions,
    topRuleRows,
    topRewardRows,
    topEarnerRows,
    topSpenderRows,
  ] = await Promise.all([
    prisma.rewardTransaction.findMany({
      where: {
        createdAt: {
          gte: currentStart,
          lt: currentEnd,
        },
      },
      select: {
        createdAt: true,
        type: true,
        rewardAmount: true,
        metadata: true,
        ruleKey: true,
        rewardKey: true,
        userId: true,
      },
    }),
    prisma.rewardTransaction.findMany({
      where: {
        createdAt: {
          gte: previousStart,
          lt: previousEnd,
        },
      },
      select: {
        type: true,
        rewardAmount: true,
        metadata: true,
      },
    }),
    prisma.rewardTransaction.groupBy({
      by: ["ruleKey"],
      where: {
        type: RewardTransactionType.earn,
        ruleKey: { not: null },
        createdAt: {
          gte: currentStart,
          lt: currentEnd,
        },
      },
      _sum: { rewardAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { rewardAmount: "desc" } },
      take: 5,
    }) as unknown as GroupRow[],
    prisma.rewardTransaction.groupBy({
      by: ["rewardKey"],
      where: {
        type: RewardTransactionType.spend,
        rewardKey: { not: null },
        createdAt: {
          gte: currentStart,
          lt: currentEnd,
        },
      },
      _sum: { rewardAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { rewardAmount: "desc" } },
      take: 5,
    }) as unknown as GroupRow[],
    prisma.rewardTransaction.groupBy({
      by: ["userId"],
      where: {
        type: RewardTransactionType.earn,
        createdAt: {
          gte: currentStart,
          lt: currentEnd,
        },
      },
      _sum: { rewardAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { rewardAmount: "desc" } },
      take: 5,
    }) as unknown as GroupRow[],
    prisma.rewardTransaction.groupBy({
      by: ["userId"],
      where: {
        type: RewardTransactionType.spend,
        createdAt: {
          gte: currentStart,
          lt: currentEnd,
        },
      },
      _sum: { rewardAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { rewardAmount: "desc" } },
      take: 5,
    }) as unknown as GroupRow[],
  ])

  const ruleKeys = topRuleRows
    .map((row) => row.ruleKey)
    .filter((value): value is string => Boolean(value))
  const rewardKeys = topRewardRows
    .map((row) => row.rewardKey)
    .filter((value): value is string => Boolean(value))
  const earnerIds = topEarnerRows
    .map((row) => row.userId)
    .filter((value): value is string => Boolean(value))
  const spenderIds = topSpenderRows
    .map((row) => row.userId)
    .filter((value): value is string => Boolean(value))

  const uniqueUserIds = Array.from(new Set([...earnerIds, ...spenderIds]))
  const [rules, catalogItems, users] = await Promise.all([
    ruleKeys.length
      ? prisma.rewardRule.findMany({
          where: { key: { in: ruleKeys } },
          select: { key: true, name: true },
        })
      : Promise.resolve([] as { key: string; name: string }[]),
    rewardKeys.length
      ? prisma.rewardCatalogItem.findMany({
          where: { featureKey: { in: rewardKeys } },
          select: { featureKey: true, name: true },
        })
      : Promise.resolve([] as { featureKey: string; name: string }[]),
    uniqueUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: uniqueUserIds } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        })
      : Promise.resolve(
          [] as {
            id: string
            email: string | null
            firstName: string | null
            lastName: string | null
          }[],
        ),
  ])

  const ruleNameMap = new Map(rules.map((rule) => [rule.key, rule.name]))
  const catalogNameMap = new Map(
    catalogItems.map((item) => [item.featureKey, item.name]),
  )
  const userMap = new Map(
    users.map((user) => [
      user.id,
      {
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.email ||
          user.id,
        email: user.email,
      },
    ]),
  )

  let earnedAmount = 0
  let earnedCount = 0
  let spentAmount = 0
  let spentCount = 0
  let refundAmount = 0
  let refundCount = 0
  let adjustmentAmount = 0
  let adjustmentCount = 0
  let adjustmentPositive = 0
  let adjustmentNegative = 0
  let adjustmentNet = 0

  const currentTimeline = new Map<string, TimelineAccumulator>()
  for (let day = 0; day < windowDays; day += 1) {
    const bucketDate = addDays(currentStart, day)
    const iso = format(bucketDate, "yyyy-MM-dd")
    currentTimeline.set(iso, {
      date: iso,
      label: format(bucketDate, TIMELINE_LABEL_FORMAT),
      earn: 0,
      spend: 0,
      adjustment: 0,
      refund: 0,
      netAdjustment: 0,
    })
  }

  for (const tx of currentTransactions) {
    const amount = normaliseAmount(tx.rewardAmount)
    const bucket = format(tx.createdAt, "yyyy-MM-dd")
    const point = currentTimeline.get(bucket)
    switch (tx.type) {
      case RewardTransactionType.earn: {
        earnedAmount += amount
        earnedCount += 1
        if (point) {
          point.earn += amount
        }
        break
      }
      case RewardTransactionType.spend: {
        spentAmount += amount
        spentCount += 1
        if (point) {
          point.spend += amount
        }
        break
      }
      case RewardTransactionType.refund: {
        refundAmount += amount
        refundCount += 1
        if (point) {
          point.refund += amount
        }
        break
      }
      case RewardTransactionType.adjustment: {
        adjustmentAmount += amount
        adjustmentCount += 1
        const signed = extractAdjustmentSignedAmount(amount, tx.metadata)
        if (signed >= 0) adjustmentPositive += signed
        else adjustmentNegative += Math.abs(signed)
        adjustmentNet += signed
        if (point) {
          point.adjustment += amount
          point.netAdjustment += signed
        }
        break
      }
      default:
        break
    }
  }

  let prevEarnedAmount = 0
  let prevEarnedCount = 0
  let prevSpentAmount = 0
  let prevSpentCount = 0
  let prevRefundAmount = 0
  let prevRefundCount = 0
  let prevAdjustmentAmount = 0
  let prevAdjustmentCount = 0
  let prevAdjustmentPositive = 0
  let prevAdjustmentNegative = 0
  let prevAdjustmentNet = 0

  for (const tx of previousTransactions) {
    const amount = normaliseAmount(tx.rewardAmount)
    switch (tx.type) {
      case RewardTransactionType.earn:
        prevEarnedAmount += amount
        prevEarnedCount += 1
        break
      case RewardTransactionType.spend:
        prevSpentAmount += amount
        prevSpentCount += 1
        break
      case RewardTransactionType.refund:
        prevRefundAmount += amount
        prevRefundCount += 1
        break
      case RewardTransactionType.adjustment: {
        prevAdjustmentAmount += amount
        prevAdjustmentCount += 1
        const signed = extractAdjustmentSignedAmount(amount, tx.metadata)
        if (signed >= 0) prevAdjustmentPositive += signed
        else prevAdjustmentNegative += Math.abs(signed)
        prevAdjustmentNet += signed
        break
      }
      default:
        break
    }
  }

  const timeline: RewardAnalyticsTimelinePoint[] = Array.from(
    currentTimeline.values(),
  ).map((point) => ({
    date: point.date,
    label: point.label,
    earn: point.earn,
    spend: point.spend,
    adjustment: point.adjustment,
    refund: point.refund,
    net: point.earn - point.spend + point.refund + point.netAdjustment,
  }))

  const earnedDelta = calcChange(earnedAmount, prevEarnedAmount)
  const spentDelta = calcChange(spentAmount, prevSpentAmount)
  const refundDelta = calcChange(refundAmount, prevRefundAmount)
  const adjustmentDelta = calcChange(adjustmentAmount, prevAdjustmentAmount)
  const netIssued = earnedAmount - spentAmount + refundAmount + adjustmentNet
  const prevNetIssued =
    prevEarnedAmount - prevSpentAmount + prevRefundAmount + prevAdjustmentNet
  const netDelta = calcChange(netIssued, prevNetIssued)

  const totals: RewardAnalyticsSummary["totals"] = {
    earned: {
      amount: earnedAmount,
      previousAmount: prevEarnedAmount,
      delta: earnedDelta,
      count: earnedCount,
      previousCount: prevEarnedCount,
    },
    spent: {
      amount: spentAmount,
      previousAmount: prevSpentAmount,
      delta: spentDelta,
      count: spentCount,
      previousCount: prevSpentCount,
    },
    refunded: {
      amount: refundAmount,
      previousAmount: prevRefundAmount,
      delta: refundDelta,
      count: refundCount,
      previousCount: prevRefundCount,
    },
    adjustments: {
      amount: adjustmentAmount,
      previousAmount: prevAdjustmentAmount,
      delta: adjustmentDelta,
      count: adjustmentCount,
      previousCount: prevAdjustmentCount,
      net: adjustmentNet,
      previousNet: prevAdjustmentNet,
      positiveAmount: adjustmentPositive,
      negativeAmount: adjustmentNegative,
      previousPositiveAmount: prevAdjustmentPositive,
      previousNegativeAmount: prevAdjustmentNegative,
    },
    netIssued: {
      amount: netIssued,
      previousAmount: prevNetIssued,
      delta: netDelta,
    },
  }

  const buildLeaderboardEntry = (
    rows: GroupRow[],
    getId: (row: GroupRow) => string | undefined,
    resolveName: (id: string) => string,
    total: number,
  ): RewardAnalyticsLeaderboardEntry[] =>
    rows
      .map((row) => {
        const id = getId(row)
        if (!id) return null
        const amount = normaliseAmount(row._sum.rewardAmount)
        if (amount <= 0) return null
        return {
          id,
          name: resolveName(id),
          amount,
          share: total > 0 ? amount / total : 0,
          count: row._count._all ?? 0,
        }
      })
      .filter((value): value is RewardAnalyticsLeaderboardEntry =>
        Boolean(value),
      )

  const topRules: RewardAnalyticsLeaderboardEntry[] = buildLeaderboardEntry(
    topRuleRows,
    (row) => row.ruleKey ?? undefined,
    (id) => ruleNameMap.get(id) ?? id,
    earnedAmount,
  )

  const topRewards: RewardAnalyticsLeaderboardEntry[] = buildLeaderboardEntry(
    topRewardRows,
    (row) => row.rewardKey ?? undefined,
    (id) => catalogNameMap.get(id) ?? id,
    spentAmount,
  )

  const buildUserEntry = (
    rows: GroupRow[],
    total: number,
  ): RewardAnalyticsUserEntry[] => {
    const result: RewardAnalyticsUserEntry[] = []
    for (const row of rows) {
      const userId = row.userId
      if (!userId) continue
      const amount = normaliseAmount(row._sum.rewardAmount)
      if (amount <= 0) continue
      const user = userMap.get(userId)
      result.push({
        id: userId,
        name: user?.name ?? userId,
        email: user?.email,
        amount,
        share: total > 0 ? amount / total : 0,
        count: row._count._all ?? 0,
      })
    }
    return result
  }

  const topEarners = buildUserEntry(topEarnerRows, earnedAmount)
  const topSpenders = buildUserEntry(topSpenderRows, spentAmount)

  return {
    rangeDays: windowDays,
    totals,
    timeline,
    leaders: {
      topRules,
      topRewards,
      topEarners,
      topSpenders,
    },
  }
}
