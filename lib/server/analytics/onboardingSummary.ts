import { addDays, format, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import type { Prisma } from "@/lib/vendor/prisma/client"
import type {
  NewsletterIntentBreakdownItem,
  OnboardingAnswerBreakdownItem,
  OnboardingAnswersSummary,
  OnboardingOutcomeDeltaItem,
  OnboardingSignupPoint,
} from "@/types/analytics"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"

const ROLE_INTENT_LABELS: Record<string, string> = {
  "launch-product": "Launch a product",
  "manage-team": "Manage a team",
  explore: "Just exploring",
}

const HEARD_FROM_LABELS: Record<string, string> = {
  twitter: "Twitter / X",
  reddit: "Reddit",
  producthunt: "Product Hunt",
  hackernews: "Hacker News",
  google: "Google",
  discord: "Discord",
  friend: "Friend or colleague",
  other: "Other",
}

const NEWSLETTER_INTENT_GROUPS: {
  id: string
  label: string
  intents: Set<string>
}[] = [
  {
    id: "builder",
    label: "Builders",
    intents: new Set(["launch-product", "manage-team"]),
  },
  {
    id: "explorer",
    label: "Explorers",
    intents: new Set(["explore"]),
  },
]

const SIGNUP_TIMELINE_DAYS = 30
const SIGNUP_TIMELINE_LABEL_FORMAT = "MMM d"

type PendingOnboardingUser = Prisma.UserGetPayload<{
  select: {
    id: true
    firstName: true
    lastName: true
    email: true
    createdAt: true
  }
}>

type RecentOnboardingUser = Prisma.UserGetPayload<{
  select: {
    id: true
    firstName: true
    lastName: true
    email: true
    roleIntent: true
    heardFrom: true
    updatedAt: true
  }
}>

type CompletedMember = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    roleIntent: true
    heardFrom: true
  }
}>

type NewsletterSubscriptionEmail = Prisma.NewsletterSubscriptionGetPayload<{
  select: { email: true }
}>

type RegisteredUserEmail = Prisma.UserGetPayload<{
  select: { email: true }
}>

type DistinctUserSelection = { userId: string }

type FeedbackAggregateRow = {
  userId: string
  _count: { _all: number; rating: number }
  _sum: { rating: number | null }
}

function labelForValue(
  value: string,
  mapping: Record<string, string>,
  fallback: string,
) {
  if (value in mapping) return mapping[value]
  const cleaned = value.replace(/[-_]/g, " ").trim()
  if (!cleaned) return fallback
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function getRoleIntentLabel(value: string) {
  return labelForValue(value, ROLE_INTENT_LABELS, "Unknown")
}

export function getHeardFromLabel(value: string) {
  return labelForValue(value, HEARD_FROM_LABELS, "Unknown")
}

function buildBreakdown(
  total: number,
  entries: { value: string; count: number }[],
  mapping: Record<string, string>,
  fallbackLabel: string,
): OnboardingAnswerBreakdownItem[] {
  if (total === 0) return []

  return entries
    .map((entry) => ({
      value: entry.value,
      label: labelForValue(entry.value, mapping, fallbackLabel),
      count: entry.count,
      percentage: (entry.count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
}

type OutcomeAccumulator = {
  value: string
  label: string
  total: number
  productOwners: number
  upvoters: number
  purchasers: number
  feedbackSubmitters: number
  feedbackEntries: number
  feedbackRatingSum: number
  feedbackRatingsWithValue: number
}

function buildOutcomeItems(
  map: Map<string, OutcomeAccumulator>,
): OnboardingOutcomeDeltaItem[] {
  return Array.from(map.values())
    .map<OnboardingOutcomeDeltaItem>((item) => ({
      value: item.value,
      label: item.label,
      total: item.total,
      productOwners: item.productOwners,
      productOwnerRate:
        item.total === 0 ? 0 : (item.productOwners / item.total) * 100,
      upvoters: item.upvoters,
      upvoterRate: item.total === 0 ? 0 : (item.upvoters / item.total) * 100,
      purchasers: item.purchasers,
      purchaserRate:
        item.total === 0 ? 0 : (item.purchasers / item.total) * 100,
      feedbackSubmitters: item.feedbackSubmitters,
      feedbackSubmissionRate:
        item.total === 0 ? 0 : (item.feedbackSubmitters / item.total) * 100,
      feedbackCount: item.feedbackEntries,
      feedbackAverageRating:
        item.feedbackRatingsWithValue === 0
          ? null
          : item.feedbackRatingSum / item.feedbackRatingsWithValue,
    }))
    .sort((a, b) => b.total - a.total)
}

export async function getOnboardingAnswersSummary(): Promise<OnboardingAnswersSummary> {
  const activeWhere = { status: "active" as const }
  const completedWhere = {
    ...activeWhere,
    roleIntent: { not: null },
    heardFrom: { not: null },
  }

  const oneWeekAgo = subDays(new Date(), 7)
  const today = startOfDay(new Date())
  const timelineStart = subDays(today, SIGNUP_TIMELINE_DAYS - 1)
  const timelineEnd = addDays(today, 1)

  const cacheKey = buildCacheKey("analytics", "onboardingSummary")
  const cacheTtlSeconds = resolveCacheTtl("slowest")

  const cachedSummary = await cacheHit<OnboardingAnswersSummary>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read onboarding summary cache", {
        cacheKey,
        error,
      })
    },
  })

  if (cachedSummary) {
    return cachedSummary
  }

  const [
    totalActiveUsers,
    completedResponses,
    rawRoleIntentGroups,
    rawHeardFromGroups,
    completedLast7Days,
    latestCompleted,
    completedMembers,
    allNewsletterSubscriptions,
    registeredUsers,
    signupRecords,
  ] = await Promise.all([
    prisma.user.count({
      where: activeWhere,
    }),
    prisma.user.count({
      where: completedWhere,
    }),
    prisma.user.groupBy({
      by: ["roleIntent"],
      where: completedWhere,
      _count: { roleIntent: true },
    }),
    prisma.user.groupBy({
      by: ["heardFrom"],
      where: completedWhere,
      _count: { heardFrom: true },
    }),
    prisma.user.count({
      where: {
        ...completedWhere,
        updatedAt: { gte: oneWeekAgo },
      },
    }),
    prisma.user.findFirst({
      where: completedWhere,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
      },
    }),
    prisma.user.findMany({
      where: completedWhere,
      select: {
        id: true,
        email: true,
        roleIntent: true,
        heardFrom: true,
      },
    }) as Promise<CompletedMember[]>,
    prisma.newsletterSubscription.findMany({
      select: { email: true },
    }) as Promise<NewsletterSubscriptionEmail[]>,
    prisma.user.findMany({
      select: { email: true },
    }) as Promise<RegisteredUserEmail[]>,
    prisma.user.findMany({
      where: {
        ...activeWhere,
        createdAt: {
          gte: timelineStart,
          lt: timelineEnd,
        },
      },
      select: { createdAt: true },
    }) as Promise<Array<{ createdAt: Date }>>,
  ])

  type RoleIntentGroup = Pick<
    Prisma.UserGroupByOutputType,
    "roleIntent" | "_count"
  >
  type HeardFromGroup = Pick<
    Prisma.UserGroupByOutputType,
    "heardFrom" | "_count"
  >

  const roleIntentGroups = rawRoleIntentGroups as RoleIntentGroup[]
  const heardFromGroups = rawHeardFromGroups as HeardFromGroup[]

  const roleIntentEntries = roleIntentGroups
    .filter((group) => group.roleIntent)
    .map((group) => ({
      value: group.roleIntent as string,
      count: group._count?.roleIntent ?? 0,
    }))

  const heardFromEntries = heardFromGroups
    .filter((group) => group.heardFrom)
    .map((group) => ({
      value: group.heardFrom as string,
      count: group._count?.heardFrom ?? 0,
    }))

  const roleIntentBreakdown = buildBreakdown(
    completedResponses,
    roleIntentEntries,
    ROLE_INTENT_LABELS,
    "Unknown",
  )

  const heardFromBreakdown = buildBreakdown(
    completedResponses,
    heardFromEntries,
    HEARD_FROM_LABELS,
    "Unknown",
  )

  const completionRate =
    totalActiveUsers === 0 ? 0 : (completedResponses / totalActiveUsers) * 100

  const pendingUsers = Math.max(totalActiveUsers - completedResponses, 0)

  const lastResponseAt = latestCompleted?.updatedAt?.toISOString() ?? null

  const newsletterEmailSet = new Set(
    allNewsletterSubscriptions
      .map((entry: NewsletterSubscriptionEmail) => entry.email?.toLowerCase())
      .filter(Boolean) as string[],
  )

  const registeredEmailSet = new Set(
    registeredUsers
      .map((user: RegisteredUserEmail) => user.email?.toLowerCase())
      .filter(Boolean) as string[],
  )

  let newsletterRegisteredSubscribers = 0

  for (const email of registeredEmailSet) {
    if (newsletterEmailSet.has(email)) {
      newsletterRegisteredSubscribers += 1
    }
  }

  const newsletterRegisteredNotSubscribed = Math.max(
    registeredEmailSet.size - newsletterRegisteredSubscribers,
    0,
  )

  const newsletterUnregisteredSubscribers = Math.max(
    newsletterEmailSet.size - newsletterRegisteredSubscribers,
    0,
  )

  let newsletterSubscribed = 0
  let newsletterOptedOut = 0

  const intentTallies = new Map<string, NewsletterIntentBreakdownItem>()

  for (const member of completedMembers) {
    const email = member.email?.toLowerCase()
    if (!email) continue

    const isSubscribed = newsletterEmailSet.has(email)
    if (isSubscribed) {
      newsletterSubscribed += 1
    } else {
      newsletterOptedOut += 1
    }

    const intent = member.roleIntent
    if (!intent) continue

    const group = NEWSLETTER_INTENT_GROUPS.find((item) =>
      item.intents.has(intent),
    )

    if (!group) continue

    const existing = intentTallies.get(group.id) ?? {
      id: group.id,
      label: group.label,
      subscribed: 0,
      optedOut: 0,
      total: 0,
      subscribedPercentage: 0,
    }

    if (isSubscribed) {
      existing.subscribed += 1
    } else {
      existing.optedOut += 1
    }

    intentTallies.set(group.id, existing)
  }

  const newsletterIntentBreakdown = Array.from(intentTallies.values())
    .map((item) => {
      const total = item.subscribed + item.optedOut
      return {
        ...item,
        total,
        subscribedPercentage: total === 0 ? 0 : (item.subscribed / total) * 100,
      }
    })
    .sort((a, b) => b.total - a.total)

  const completedUserIds = completedMembers
    .map((member) => member.id)
    .filter((id): id is string => Boolean(id))

  let productOwnerRows: DistinctUserSelection[] = []
  let upvoteRows: DistinctUserSelection[] = []
  let purchaserRows: DistinctUserSelection[] = []
  let feedbackAggregates: FeedbackAggregateRow[] = []

  if (completedUserIds.length) {
    ;[productOwnerRows, upvoteRows, purchaserRows, feedbackAggregates] =
      await Promise.all([
        prisma.product.findMany({
          where: {
            userId: { in: completedUserIds },
          },
          select: { userId: true },
          distinct: ["userId"],
        }) as Promise<DistinctUserSelection[]>,
        prisma.productUpvote.findMany({
          where: {
            userId: { in: completedUserIds },
          },
          select: { userId: true },
          distinct: ["userId"],
        }) as Promise<DistinctUserSelection[]>,
        prisma.userPlanPurchase.findMany({
          where: {
            userId: { in: completedUserIds },
          },
          select: { userId: true },
          distinct: ["userId"],
        }) as Promise<DistinctUserSelection[]>,
        prisma.memberFeedback.groupBy({
          by: ["userId"],
          where: {
            userId: { in: completedUserIds },
          },
          _count: { _all: true, rating: true },
          _sum: { rating: true },
        }) as unknown as Promise<FeedbackAggregateRow[]>,
      ])
  }

  const productOwnerSet = new Set(productOwnerRows.map((row) => row.userId))
  const upvoteUserSet = new Set(upvoteRows.map((row) => row.userId))
  const purchaserUserSet = new Set(purchaserRows.map((row) => row.userId))
  const feedbackAggregateMap = new Map(
    feedbackAggregates.map((row) => [row.userId, row]),
  )

  const roleIntentOutcomeMap = new Map<string, OutcomeAccumulator>()
  const heardFromOutcomeMap = new Map<string, OutcomeAccumulator>()

  const ensureOutcomeBucket = (
    map: Map<string, OutcomeAccumulator>,
    value: string,
    label: string,
  ) => {
    let bucket = map.get(value)
    if (!bucket) {
      bucket = {
        value,
        label,
        total: 0,
        productOwners: 0,
        upvoters: 0,
        purchasers: 0,
        feedbackSubmitters: 0,
        feedbackEntries: 0,
        feedbackRatingSum: 0,
        feedbackRatingsWithValue: 0,
      }
      map.set(value, bucket)
    }
    return bucket
  }

  for (const member of completedMembers) {
    const userId = member.id
    if (!userId) continue

    if (member.roleIntent) {
      const label = getRoleIntentLabel(member.roleIntent)
      const bucket = ensureOutcomeBucket(
        roleIntentOutcomeMap,
        member.roleIntent,
        label,
      )
      bucket.total += 1
      if (productOwnerSet.has(userId)) bucket.productOwners += 1
      if (upvoteUserSet.has(userId)) bucket.upvoters += 1
      if (purchaserUserSet.has(userId)) bucket.purchasers += 1
      const feedback = feedbackAggregateMap.get(userId)
      if (feedback) {
        bucket.feedbackSubmitters += 1
        bucket.feedbackEntries += feedback._count._all
        const ratingSum = feedback._sum.rating ?? 0
        bucket.feedbackRatingSum += ratingSum
        bucket.feedbackRatingsWithValue += feedback._count.rating ?? 0
      }
    }

    if (member.heardFrom) {
      const label = getHeardFromLabel(member.heardFrom)
      const bucket = ensureOutcomeBucket(
        heardFromOutcomeMap,
        member.heardFrom,
        label,
      )
      bucket.total += 1
      if (productOwnerSet.has(userId)) bucket.productOwners += 1
      if (upvoteUserSet.has(userId)) bucket.upvoters += 1
      if (purchaserUserSet.has(userId)) bucket.purchasers += 1
      const feedback = feedbackAggregateMap.get(userId)
      if (feedback) {
        bucket.feedbackSubmitters += 1
        bucket.feedbackEntries += feedback._count._all
        const ratingSum = feedback._sum.rating ?? 0
        bucket.feedbackRatingSum += ratingSum
        bucket.feedbackRatingsWithValue += feedback._count.rating ?? 0
      }
    }
  }

  const roleIntentOutcomes = buildOutcomeItems(roleIntentOutcomeMap)
  const heardFromOutcomes = buildOutcomeItems(heardFromOutcomeMap)

  const signupTimelineBuckets = new Map<string, OnboardingSignupPoint>()
  for (let index = 0; index < SIGNUP_TIMELINE_DAYS; index += 1) {
    const bucketDate = addDays(timelineStart, index)
    const iso = format(bucketDate, "yyyy-MM-dd")
    signupTimelineBuckets.set(iso, {
      date: iso,
      label: format(bucketDate, SIGNUP_TIMELINE_LABEL_FORMAT),
      signups: 0,
    })
  }

  for (const record of signupRecords) {
    const bucketKey = format(startOfDay(record.createdAt), "yyyy-MM-dd")
    const bucket = signupTimelineBuckets.get(bucketKey)
    if (bucket) {
      bucket.signups += 1
    }
  }

  const signupTimeline = Array.from(signupTimelineBuckets.values())

  const summary: OnboardingAnswersSummary = {
    totalActiveUsers,
    completedResponses,
    completionRate,
    pendingUsers,
    completedLast7Days,
    lastResponseAt,
    roleIntentBreakdown,
    heardFromBreakdown,
    newsletterSubscribed,
    newsletterOptedOut,
    newsletterIntentBreakdown,
    newsletterRegisteredSubscribers,
    newsletterRegisteredNotSubscribed,
    newsletterUnregisteredSubscribers,
    roleIntentOutcomes,
    heardFromOutcomes,
    signupTimeline,
  }

  await cacheMiss({
    key: cacheKey,
    value: summary,
    ttlSeconds: cacheTtlSeconds,
    onError: (error) => {
      console.error("[analytics] failed to cache onboarding summary", {
        cacheKey,
        error,
      })
    },
  })

  return summary
}

export async function getPendingOnboardingUsers(
  limit = 12,
): Promise<PendingOnboardingUser[]> {
  return prisma.user.findMany({
    where: {
      status: "active",
      OR: [{ roleIntent: null }, { heardFrom: null }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
    },
  })
}

export async function getRecentOnboardingCompletions(
  limit = 12,
): Promise<RecentOnboardingUser[]> {
  return prisma.user.findMany({
    where: {
      status: "active",
      roleIntent: { not: null },
      heardFrom: { not: null },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      roleIntent: true,
      heardFrom: true,
      updatedAt: true,
    },
  })
}
