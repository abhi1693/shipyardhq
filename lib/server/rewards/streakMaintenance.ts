import prisma from "@/lib/prisma"
import { awardRewards } from "@/lib/rewards/engine"
import type { Prisma, RewardBalance } from "@/lib/vendor/prisma/client"

const MS_PER_DAY = 86_400_000
const STREAK_RULE_KEY = "rewards.streak.maintain"

const STREAK_TIERS = [
  { tier: "bronze", minimum: 3 },
  { tier: "silver", minimum: 7 },
  { tier: "gold", minimum: 14 },
] as const

// Qualifying actions that extend the daily streak window.
const STREAK_TRIGGER_RULE_KEYS = [
  "rewards.login.daily",
  "rewards.upvote.give",
  "rewards.review.publish",
  "rewards.review.depth",
] as const

type StreakTriggerRule = (typeof STREAK_TRIGGER_RULE_KEYS)[number]

type StreakBalanceSnapshot = Pick<
  RewardBalance,
  | "userId"
  | "currentStreakCount"
  | "longestStreakCount"
  | "currentStreakTier"
  | "streakActiveThrough"
  | "lastEvaluatedAt"
>

type RunStreakMaintenanceOptions = {
  now?: Date
}

type StreakMaintenanceFailure = {
  userId: string
  reason: string
}

export type StreakMaintenanceSummary = {
  evaluatedDay: string
  evaluationRunAt: string
  qualifyingUsers: number
  streaksExtended: number
  awardsCreated: number
  tiersAwarded: Record<string, number>
  triggerRuleTotals: Record<string, number>
  alreadyEvaluated: number
  streaksReset: number
  failures: StreakMaintenanceFailure[]
}

export async function runStreakMaintenance(
  options: RunStreakMaintenanceOptions = {},
): Promise<StreakMaintenanceSummary> {
  const now = options.now ?? new Date()
  const evaluationDayStart = startOfUtcDay(now)
  const activityDayStart = addDays(evaluationDayStart, -1)
  const activityDayKey = formatDayKey(activityDayStart)

  const summary: StreakMaintenanceSummary = {
    evaluatedDay: activityDayKey,
    evaluationRunAt: now.toISOString(),
    qualifyingUsers: 0,
    streaksExtended: 0,
    awardsCreated: 0,
    tiersAwarded: {},
    triggerRuleTotals: {},
    alreadyEvaluated: 0,
    streaksReset: 0,
    failures: [],
  }

  const triggerRows = await prisma.rewardTransaction.findMany({
    where: {
      ruleKey: { in: [...STREAK_TRIGGER_RULE_KEYS] },
      createdAt: {
        gte: activityDayStart,
        lt: evaluationDayStart,
      },
    },
    select: { userId: true, ruleKey: true },
  })
  const triggerMap = collectTriggerRules(triggerRows)
  const qualifyingUserIds = Array.from(triggerMap.keys())

  summary.qualifyingUsers = qualifyingUserIds.length
  for (const rules of triggerMap.values()) {
    for (const rule of rules) {
      summary.triggerRuleTotals[rule] =
        (summary.triggerRuleTotals[rule] ?? 0) + 1
    }
  }

  const balances = qualifyingUserIds.length
    ? await prisma.rewardBalance.findMany({
        where: { userId: { in: qualifyingUserIds } },
        select: {
          userId: true,
          currentStreakCount: true,
          longestStreakCount: true,
          currentStreakTier: true,
          streakActiveThrough: true,
          lastEvaluatedAt: true,
        },
      })
    : []

  const balanceMap = new Map<string, StreakBalanceSnapshot>(
    balances.map((balance: (typeof balances)[number]) => [
      balance.userId,
      balance,
    ]),
  )

  const processedUserIds = new Set<string>()

  for (const userId of qualifyingUserIds) {
    const balance = balanceMap.get(userId)

    if (alreadyEvaluatedToday(balance, evaluationDayStart)) {
      summary.alreadyEvaluated += 1
      continue
    }

    const previousCount = balance?.currentStreakCount ?? 0
    const hasActiveStreak =
      previousCount > 0 &&
      balance?.streakActiveThrough != null &&
      balance.streakActiveThrough >= evaluationDayStart

    const newCount = hasActiveStreak ? previousCount + 1 : 1
    const newLongest = Math.max(balance?.longestStreakCount ?? 0, newCount)
    const tier = resolveTier(newCount)
    const activeThrough = addDays(evaluationDayStart, 1)
    const streakPayload = {
      count: newCount,
      longest: newLongest,
      tier,
      activeThrough,
      evaluatedAt: now,
    } as const

    const triggerRules = Array.from(triggerMap.get(userId) ?? [])

    const metadata = {
      day: activityDayKey,
      streakCount: newCount,
      longestStreakCount: newLongest,
      tier,
      activeThrough: activeThrough.toISOString(),
      triggerRules,
    }

    const eventId = `${activityDayKey}:streak`

    if (tier) {
      try {
        const awardResult = await awardRewards(userId, STREAK_RULE_KEY, {
          eventId,
          sourceType: "cron.streak",
          sourceId: eventId,
          targetType: "user",
          targetId: userId,
          metadata,
          streak: streakPayload,
        })

        processedUserIds.add(userId)
        summary.streaksExtended += 1

        if (awardResult.created) {
          summary.awardsCreated += 1
          summary.tiersAwarded[tier] = (summary.tiersAwarded[tier] ?? 0) + 1
        }

        continue
      } catch (error) {
        console.error("[cron.rewards.streak] failed to award streak", {
          userId,
          error,
        })
        summary.failures.push({
          userId,
          reason: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    await prisma.rewardBalance.upsert({
      where: { userId },
      update: {
        currentStreakCount: newCount,
        longestStreakCount: newLongest,
        currentStreakTier: tier ?? null,
        streakActiveThrough: activeThrough,
        lastEvaluatedAt: now,
      },
      create: {
        userId,
        currentStreakCount: newCount,
        longestStreakCount: newLongest,
        currentStreakTier: tier ?? null,
        streakActiveThrough: activeThrough,
        lastEvaluatedAt: now,
      },
    })

    processedUserIds.add(userId)
    summary.streaksExtended += 1
  }

  const resetWhere: Prisma.RewardBalanceWhereInput = {
    currentStreakCount: { gt: 0 },
    streakActiveThrough: { not: null, lte: evaluationDayStart },
  }

  if (processedUserIds.size > 0) {
    resetWhere.userId = { notIn: Array.from(processedUserIds) }
  }

  const resetResult = await prisma.rewardBalance.updateMany({
    where: resetWhere,
    data: {
      currentStreakCount: 0,
      currentStreakTier: null,
      streakActiveThrough: null,
      lastEvaluatedAt: now,
    },
  })

  summary.streaksReset = resetResult.count

  return summary
}

function collectTriggerRules(
  rows: Array<{ userId: string | null; ruleKey: string | null }>,
): Map<string, Set<StreakTriggerRule>> {
  const map = new Map<string, Set<StreakTriggerRule>>()
  for (const row of rows) {
    if (!row.userId || !row.ruleKey) continue
    if (!isStreakTriggerRule(row.ruleKey)) continue
    let rules = map.get(row.userId)
    if (!rules) {
      rules = new Set<StreakTriggerRule>()
      map.set(row.userId, rules)
    }
    rules.add(row.ruleKey)
  }
  return map
}

function alreadyEvaluatedToday(
  balance: StreakBalanceSnapshot | undefined,
  evaluationDayStart: Date,
): boolean {
  if (!balance?.lastEvaluatedAt) {
    return false
  }
  return balance.lastEvaluatedAt >= evaluationDayStart
}

function resolveTier(count: number): string | null {
  let tier: string | null = null
  for (const entry of STREAK_TIERS) {
    if (count >= entry.minimum) {
      tier = entry.tier
    }
  }
  return tier
}

function isStreakTriggerRule(ruleKey: string): ruleKey is StreakTriggerRule {
  return STREAK_TRIGGER_RULE_KEYS.includes(ruleKey as StreakTriggerRule)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export { STREAK_RULE_KEY }
