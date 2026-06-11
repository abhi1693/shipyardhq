import { addDays, format, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import type { Prisma } from "@/lib/vendor/prisma/client"
import type {
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

const SIGNUP_TIMELINE_LABEL_FORMAT = "MMM d"

function isSignupTimeline(value: unknown): value is OnboardingSignupPoint[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== "object") return false
    const entry = item as Record<string, unknown>
    return (
      typeof entry.date === "string" &&
      typeof entry.label === "string" &&
      typeof entry.signups === "number" &&
      Number.isFinite(entry.signups)
    )
  })
}

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
    roleIntent: true
    heardFrom: true
  }
}>

type DistinctUserSelection = { userId: string }

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
    }))
    .sort((a, b) => b.total - a.total)
}

export async function getOnboardingAnswersSummary(
  rangeDays = 7,
): Promise<OnboardingAnswersSummary> {
  const windowDays = Math.max(Math.floor(rangeDays), 1)
  const today = startOfDay(new Date())
  const rangeStart = subDays(today, windowDays - 1)
  const rangeEnd = addDays(today, 1)

  const activeWhere = {
    status: "active" as const,
    updatedAt: {
      gte: rangeStart,
      lt: rangeEnd,
    },
  }

  const completedRangeWhere = {
    ...activeWhere,
    roleIntent: { not: null },
    heardFrom: { not: null },
  }

  const pendingRangeWhere = {
    ...activeWhere,
    OR: [{ roleIntent: null }, { heardFrom: null }],
  }

  const timelineStart = rangeStart
  const timelineEnd = rangeEnd

  const cacheKey = buildCacheKey(
    "analytics",
    "onboardingSummary",
    `range:${windowDays}`,
  )
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
    if (
      cachedSummary.rangeDays === windowDays &&
      isSignupTimeline(
        (cachedSummary as { signupTimeline?: unknown }).signupTimeline,
      )
    ) {
      return cachedSummary
    }

    console.warn(
      "[analytics] detected invalid signup timeline cache entry; refreshing",
      { cacheKey },
    )
  }

  const [
    totalActiveUsers,
    completedResponses,
    rawRoleIntentGroups,
    rawHeardFromGroups,
    pendingInRange,
    latestCompleted,
    completedMembers,
    signupRecords,
  ] = await Promise.all([
    prisma.user.count({
      where: activeWhere,
    }),
    prisma.user.count({
      where: completedRangeWhere,
    }),
    prisma.user.groupBy({
      by: ["roleIntent"],
      where: completedRangeWhere,
      _count: { roleIntent: true },
    }),
    prisma.user.groupBy({
      by: ["heardFrom"],
      where: completedRangeWhere,
      _count: { heardFrom: true },
    }),
    prisma.user.count({
      where: pendingRangeWhere,
    }),
    prisma.user.findFirst({
      where: completedRangeWhere,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
      },
    }),
    prisma.user.findMany({
      where: completedRangeWhere,
      select: {
        id: true,
        roleIntent: true,
        heardFrom: true,
      },
    }) as Promise<CompletedMember[]>,
    prisma.user.findMany({
      where: {
        status: "active" as const,
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

  const pendingUsers = pendingInRange

  const lastResponseAt = latestCompleted?.updatedAt?.toISOString() ?? null

  const completedUserIds = completedMembers
    .map((member: (typeof completedMembers)[number]) => member.id)
    .filter((id: string | null | undefined): id is string => Boolean(id))

  let productOwnerRows: DistinctUserSelection[] = []
  let upvoteRows: DistinctUserSelection[] = []
  let purchaserRows: DistinctUserSelection[] = []

  if (completedUserIds.length) {
    ;[productOwnerRows, upvoteRows, purchaserRows] = await Promise.all([
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
    ])
  }

  const productOwnerSet = new Set(productOwnerRows.map((row) => row.userId))
  const upvoteUserSet = new Set(upvoteRows.map((row) => row.userId))
  const purchaserUserSet = new Set(purchaserRows.map((row) => row.userId))

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
    }
  }

  const roleIntentOutcomes = buildOutcomeItems(roleIntentOutcomeMap)
  const heardFromOutcomes = buildOutcomeItems(heardFromOutcomeMap)

  const signupTimelineBuckets = new Map<string, OnboardingSignupPoint>()
  for (let index = 0; index < windowDays; index += 1) {
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
  const completedInRange = completedResponses

  const summary: OnboardingAnswersSummary = {
    rangeDays: windowDays,
    totalActiveUsers,
    completedResponses,
    completionRate,
    pendingUsers,
    completedInRange,
    lastResponseAt,
    roleIntentBreakdown,
    heardFromBreakdown,
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
  rangeDays = 7,
): Promise<PendingOnboardingUser[]> {
  const windowDays = Math.max(Math.floor(rangeDays), 1)
  const today = startOfDay(new Date())
  const rangeStart = subDays(today, windowDays - 1)
  const rangeEnd = addDays(today, 1)

  return prisma.user.findMany({
    where: {
      status: "active",
      OR: [{ roleIntent: null }, { heardFrom: null }],
      createdAt: {
        gte: rangeStart,
        lt: rangeEnd,
      },
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
  rangeDays = 7,
): Promise<RecentOnboardingUser[]> {
  const windowDays = Math.max(Math.floor(rangeDays), 1)
  const today = startOfDay(new Date())
  const rangeStart = subDays(today, windowDays - 1)
  const rangeEnd = addDays(today, 1)

  return prisma.user.findMany({
    where: {
      status: "active",
      roleIntent: { not: null },
      heardFrom: { not: null },
      updatedAt: {
        gte: rangeStart,
        lt: rangeEnd,
      },
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
