import {
  differenceInCalendarDays,
  startOfDay,
  subDays,
} from "date-fns"

import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
import prisma from "@/lib/prisma"
import {
  getHeardFromLabel,
  getRoleIntentLabel,
} from "@/lib/server/analytics/onboardingSummary"
import type {
  IntentOutcomeAnalytics,
  IntentOutcomeCohort,
  IntentOutcomeRetentionMetrics,
  IntentOutcomeStageKey,
  IntentOutcomeStageMetrics,
  IntentOutcomeSummary,
} from "@/types/analytics"

const ANALYTICS_CACHE = {
  ttl: DEFAULT_TTL.slowest,
  swr: DEFAULT_SWR.slowest,
}

const analyticsTags = (...tags: string[]) =>
  accelerateTags(["adminAnalytics", "intentOutcome", ...tags])

const SPEED_BUCKETS = [
  { thresholdDays: 30, label: "Within 30 days" },
  { thresholdDays: 60, label: "Within 60 days" },
  { thresholdDays: 90, label: "Within 90 days" },
] as const

type SpeedBucketKey = (typeof SPEED_BUCKETS)[number]["thresholdDays"]

type StageKey = IntentOutcomeStageKey

type StageState = Record<StageKey, StageAccumulator>

type StageAccumulator = {
  count: number
  thresholds: Record<SpeedBucketKey, number>
  dayDiffs: number[]
}

const RETENTION_THRESHOLDS = [30, 60, 90] as const

type TrafficEvent = {
  createdAt: Date
  product: { userId: string }
}

type UpvoteEvent = {
  userId: string
  createdAt: Date
}

type PurchaseEvent = {
  userId: string
  createdAt: Date
}

const STAGE_CONFIG: ReadonlyArray<{
  key: StageKey
  label: string
  description: string
  source: "product" | "membership" | "upvote" | "feedback" | "purchase"
}> = [
  {
    key: "shippedProduct",
    label: "Shipped a product",
    description: "Created at least one product in Shipyard.",
    source: "product",
  },
  {
    key: "joinedOrganization",
    label: "Joined an organisation",
    description: "Belongs to an organisation workspace.",
    source: "membership",
  },
  {
    key: "upvotedProduct",
    label: "Upvoted another product",
    description: "Endorsed a product beyond their own launches.",
    source: "upvote",
  },
  {
    key: "submittedFeedback",
    label: "Shared feedback",
    description: "Submitted member feedback to the team.",
    source: "feedback",
  },
  {
    key: "purchasedPlan",
    label: "Purchased a plan",
    description: "Completed a paid plan purchase.",
    source: "purchase",
  },
] as const

type StageRow = {
  userId: string
  _count: { _all: number }
  _min: { createdAt: Date | null }
}

type CohortAccumulator = {
  id: string
  roleIntent: string | null
  roleIntentLabel: string
  heardFrom: string | null
  heardFromLabel: string
  totalUsers: number
  stages: StageState
  retentionCounts: Record<(typeof RETENTION_THRESHOLDS)[number], number>
}

function createThresholds(): Record<SpeedBucketKey, number> {
  return SPEED_BUCKETS.reduce(
    (acc, bucket) => ({
      ...acc,
      [bucket.thresholdDays]: 0,
    }),
    {} as Record<SpeedBucketKey, number>,
  )
}

function createStageAccumulator(): StageAccumulator {
  return {
    count: 0,
    thresholds: createThresholds(),
    dayDiffs: [],
  }
}

function createStageState(): StageState {
  return STAGE_CONFIG.reduce((acc, stage) => {
    acc[stage.key] = createStageAccumulator()
    return acc
  }, {} as StageState)
}

function createRetentionCounts(): Record<(typeof RETENTION_THRESHOLDS)[number], number> {
  return RETENTION_THRESHOLDS.reduce(
    (acc, threshold) => {
      acc[threshold] = 0
      return acc
    },
    {} as Record<(typeof RETENTION_THRESHOLDS)[number], number>,
  )
}

function cohortKey(roleIntent: string | null, heardFrom: string | null) {
  return `${roleIntent ?? "unknown"}|${heardFrom ?? "unknown"}`
}

function ensureCohort(
  map: Map<string, CohortAccumulator>,
  roleIntent: string | null,
  heardFrom: string | null,
): CohortAccumulator {
  const key = cohortKey(roleIntent, heardFrom)
  const existing = map.get(key)
  if (existing) {
    return existing
  }

  const labelForIntent = roleIntent
    ? getRoleIntentLabel(roleIntent)
    : "Unknown"
  const labelForHeardFrom = heardFrom ? getHeardFromLabel(heardFrom) : "Unknown"

  const cohort: CohortAccumulator = {
    id: key,
    roleIntent,
    roleIntentLabel: labelForIntent,
    heardFrom,
    heardFromLabel: labelForHeardFrom,
    totalUsers: 0,
    stages: createStageState(),
    retentionCounts: createRetentionCounts(),
  }
  map.set(key, cohort)
  return cohort
}

function calcMedian(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function buildStageMetrics(
  stages: StageState,
  totalUsers: number,
): IntentOutcomeStageMetrics[] {
  return STAGE_CONFIG.map((stage) => {
    const accumulator = stages[stage.key]
    const baseCount = accumulator?.count ?? 0
    const basePercentage = totalUsers > 0 ? (baseCount / totalUsers) * 100 : 0
    const speedBuckets = SPEED_BUCKETS.map((bucket) => {
      const count = accumulator?.thresholds?.[bucket.thresholdDays] ?? 0
      return {
        label: bucket.label,
        thresholdDays: bucket.thresholdDays,
        count,
        percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
      }
    })

    return {
      key: stage.key,
      label: stage.label,
      description: stage.description,
      count: baseCount,
      percentage: basePercentage,
      medianDaysToComplete: calcMedian(accumulator?.dayDiffs ?? []),
      speedBuckets,
    }
  })
}

function buildRetentionMetrics(
  counts: Record<(typeof RETENTION_THRESHOLDS)[number], number>,
  totalUsers: number,
): IntentOutcomeRetentionMetrics {
  return {
    thresholds: RETENTION_THRESHOLDS.map((threshold) => {
      const active = counts[threshold] ?? 0
      return {
        thresholdDays: threshold,
        label: `${threshold}d active`,
        activeUsers: active,
        percentage: totalUsers > 0 ? (active / totalUsers) * 100 : 0,
      }
    }),
  }
}

interface IntentOutcomeOptions {
  rangeDays?: number
}

export const getIntentOutcomeAnalytics = cached(
  async (options: IntentOutcomeOptions = {}): Promise<IntentOutcomeAnalytics> => {
    const windowDays = Math.max(Math.floor(options.rangeDays ?? 180), 1)
    const today = startOfDay(new Date())
    const rangeStart = subDays(today, windowDays - 1)

    const users = await prisma.user.findMany({
      where: {
        status: "active",
        createdAt: { gte: rangeStart },
      },
      select: {
        id: true,
        createdAt: true,
        roleIntent: true,
        heardFrom: true,
      },
      cacheStrategy: {
        ...ANALYTICS_CACHE,
        tags: analyticsTags(TAGS.users),
      },
    })

    if (!users.length) {
      return {
        rangeDays: windowDays,
        generatedAt: new Date().toISOString(),
        summary: {
          totalUsers: 0,
          totalCohorts: 0,
          stageMetrics: buildStageMetrics(createStageState(), 0),
          retention: buildRetentionMetrics(createRetentionCounts(), 0),
        },
        cohorts: [],
      }
    }

    const cohorts = new Map<string, CohortAccumulator>()
    const globalStages = createStageState()
    const summaryRetentionCounts = createRetentionCounts()
    const userMap = new Map(
      users.map((user) => {
        const cohort = ensureCohort(cohorts, user.roleIntent, user.heardFrom)
        cohort.totalUsers += 1
        return [
          user.id,
          {
            ...user,
            cohort,
          },
        ]
      }),
    )

    const retentionByUser = new Map<string, Set<(typeof RETENTION_THRESHOLDS)[number]>>()
    for (const userId of userMap.keys()) {
      retentionByUser.set(userId, new Set())
    }

    const userIds = Array.from(userMap.keys())

    let productRows: StageRow[] = []
    let membershipRows: StageRow[] = []
    let upvoteRows: StageRow[] = []
    let feedbackRows: StageRow[] = []
    let purchaseRows: StageRow[] = []
    let trafficEvents: TrafficEvent[] = []
    let upvoteEvents: UpvoteEvent[] = []
    let purchaseEvents: PurchaseEvent[] = []

    if (userIds.length) {
      ;[
        productRows,
        membershipRows,
        upvoteRows,
        feedbackRows,
        purchaseRows,
        trafficEvents,
        upvoteEvents,
        purchaseEvents,
      ] = await Promise.all([
        prisma.product.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
          },
          _count: { _all: true },
          _min: { createdAt: true },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.products),
          },
        }) as unknown as StageRow[],
        prisma.organizationMembership.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
          },
          _count: { _all: true },
          _min: { createdAt: true },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.organizations),
          },
        }) as unknown as StageRow[],
        prisma.productUpvote.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
          },
          _count: { _all: true },
          _min: { createdAt: true },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.analytics, TAGS.upvotes),
          },
        }) as unknown as StageRow[],
        prisma.memberFeedback.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
          },
          _count: { _all: true },
          _min: { createdAt: true },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.feedback),
          },
        }) as unknown as StageRow[],
        prisma.userPlanPurchase.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
          },
          _count: { _all: true },
          _min: { createdAt: true },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.subscriptions, TAGS.analytics),
          },
        }) as unknown as StageRow[],
        prisma.productTrafficEvent.findMany({
          where: {
            createdAt: { gte: rangeStart },
            product: {
              userId: { in: userIds },
            },
          },
          select: {
            createdAt: true,
            product: { select: { userId: true } },
          },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.analytics, TAGS.products),
          },
        }) as unknown as TrafficEvent[],
        prisma.productUpvote.findMany({
          where: {
            userId: { in: userIds },
            createdAt: { gte: rangeStart },
          },
          select: {
            userId: true,
            createdAt: true,
          },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.analytics, TAGS.upvotes),
          },
        }) as unknown as UpvoteEvent[],
        prisma.userPlanPurchase.findMany({
          where: {
            userId: { in: userIds },
            createdAt: { gte: rangeStart },
          },
          select: {
            userId: true,
            createdAt: true,
          },
          cacheStrategy: {
            ...ANALYTICS_CACHE,
            tags: analyticsTags(TAGS.subscriptions, TAGS.analytics),
          },
        }) as unknown as PurchaseEvent[],
      ])
    }

    const stageRowMap: Record<StageKey, StageRow[]> = {
      shippedProduct: productRows,
      joinedOrganization: membershipRows,
      upvotedProduct: upvoteRows,
      submittedFeedback: feedbackRows,
      purchasedPlan: purchaseRows,
    }

    for (const stage of STAGE_CONFIG) {
      const rows = stageRowMap[stage.key]
      for (const row of rows) {
        const user = userMap.get(row.userId)
        if (!user) continue
        const cohort = user.cohort
        const stageAccumulator = cohort.stages[stage.key]
        const globalAccumulator = globalStages[stage.key]

        stageAccumulator.count += 1
        globalAccumulator.count += 1

        const firstEventAt = row._min.createdAt ?? user.createdAt
        const diffDays = Math.max(
          differenceInCalendarDays(firstEventAt, user.createdAt),
          0,
        )

        for (const bucket of SPEED_BUCKETS) {
          if (diffDays <= bucket.thresholdDays) {
            stageAccumulator.thresholds[bucket.thresholdDays] += 1
            globalAccumulator.thresholds[bucket.thresholdDays] += 1
          }
        }

        stageAccumulator.dayDiffs.push(diffDays)
        globalAccumulator.dayDiffs.push(diffDays)
      }
    }

    const markRetention = (
      userId: string,
      eventDate: Date | null,
    ) => {
      if (!eventDate) return
      const user = userMap.get(userId)
      if (!user) return
      const diffDays = Math.max(
        differenceInCalendarDays(eventDate, user.createdAt),
        0,
      )
      const bucket = retentionByUser.get(userId)
      if (!bucket) return
      for (const threshold of RETENTION_THRESHOLDS) {
        if (diffDays >= threshold) {
          bucket.add(threshold)
        }
      }
    }

    for (const event of trafficEvents) {
      markRetention(event.product.userId, event.createdAt)
    }

    for (const event of upvoteEvents) {
      markRetention(event.userId, event.createdAt)
    }

    for (const event of purchaseEvents) {
      markRetention(event.userId, event.createdAt)
    }

    for (const [userId, user] of userMap.entries()) {
      const thresholds = retentionByUser.get(userId)
      if (!thresholds?.size) continue
      for (const threshold of thresholds) {
        summaryRetentionCounts[threshold] += 1
        user.cohort.retentionCounts[threshold] += 1
      }
    }

    const cohortList: IntentOutcomeCohort[] = Array.from(cohorts.values())
      .map<IntentOutcomeCohort>((cohort) => ({
        id: cohort.id,
        roleIntent: cohort.roleIntent,
        roleIntentLabel: cohort.roleIntentLabel,
        heardFrom: cohort.heardFrom,
        heardFromLabel: cohort.heardFromLabel,
        totalUsers: cohort.totalUsers,
        stageMetrics: buildStageMetrics(cohort.stages, cohort.totalUsers),
        retention: buildRetentionMetrics(
          cohort.retentionCounts,
          cohort.totalUsers,
        ),
      }))
      .sort((a, b) => b.totalUsers - a.totalUsers)

    const summary: IntentOutcomeSummary = {
      totalUsers: users.length,
      totalCohorts: cohortList.length,
      stageMetrics: buildStageMetrics(globalStages, users.length),
      retention: buildRetentionMetrics(summaryRetentionCounts, users.length),
    }

    return {
      rangeDays: windowDays,
      generatedAt: new Date().toISOString(),
      summary,
      cohorts: cohortList,
    }
  },
  "intentOutcomeAnalytics",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: ([options]) =>
      analyticsTags(
        TAGS.analytics,
        `range:${Math.max(Math.floor(options?.rangeDays ?? 180), 1)}`,
      ),
  },
)

export const intentOutcomeStages = STAGE_CONFIG.map((stage) => ({
  key: stage.key,
  label: stage.label,
  description: stage.description,
}))
