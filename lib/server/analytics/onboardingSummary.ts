import { subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { accelerateTags, DEFAULT_TTL, DEFAULT_SWR, TAGS } from "@/lib/cache"
import type { Prisma } from "@/lib/vendor/prisma/client"
import type {
  NewsletterIntentBreakdownItem,
  OnboardingAnswerBreakdownItem,
  OnboardingAnswersSummary,
} from "@/types/analytics"

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
    email: true
    roleIntent: true
  }
}>

type NewsletterSubscriptionEmail = Prisma.NewsletterSubscriptionGetPayload<{
  select: { email: true }
}>

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

export async function getOnboardingAnswersSummary(): Promise<OnboardingAnswersSummary> {
  const activeWhere = { status: "active" as const }
  const completedWhere = {
    ...activeWhere,
    roleIntent: { not: null },
    heardFrom: { not: null },
  }

  const oneWeekAgo = subDays(new Date(), 7)

  const adminSlowCache = {
    ttl: DEFAULT_TTL.slow,
    swr: DEFAULT_SWR.slow,
  }

  const adminTags = (...tags: string[]) =>
    accelerateTags(["adminAnalytics", ...tags])

  const [
    totalActiveUsers,
    completedResponses,
    rawRoleIntentGroups,
    rawHeardFromGroups,
    completedLast7Days,
    latestCompleted,
    completedMembers,
  ] = await Promise.all([
    prisma.user.count({
      where: activeWhere,
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users),
      },
    }),
    prisma.user.count({
      where: completedWhere,
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users),
      },
    }),
    prisma.user.groupBy({
      by: ["roleIntent"],
      where: completedWhere,
      _count: { roleIntent: true },
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users, TAGS.analytics),
      },
    }),
    prisma.user.groupBy({
      by: ["heardFrom"],
      where: completedWhere,
      _count: { heardFrom: true },
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users, TAGS.analytics),
      },
    }),
    prisma.user.count({
      where: {
        ...completedWhere,
        updatedAt: { gte: oneWeekAgo },
      },
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users),
      },
    }),
    prisma.user.findFirst({
      where: completedWhere,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
      },
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users),
      },
    }),
    prisma.user.findMany({
      where: completedWhere,
      select: {
        email: true,
        roleIntent: true,
      },
      cacheStrategy: {
        ...adminSlowCache,
        tags: adminTags(TAGS.users),
      },
    }) as Promise<CompletedMember[]>,
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

  const completedEmails = completedMembers
    .map((member: CompletedMember) => member.email?.toLowerCase())
    .filter(Boolean) as string[]

  const newsletterSubscriptions = completedEmails.length
    ? ((await prisma.newsletterSubscription.findMany({
        where: { email: { in: completedEmails } },
        select: { email: true },
        take: completedEmails.length,
        cacheStrategy: {
          ...adminSlowCache,
          tags: adminTags(TAGS.users, "newsletter"),
        },
      })) as NewsletterSubscriptionEmail[])
    : []

  const subscribedEmailSet = new Set(
    newsletterSubscriptions.map((entry: NewsletterSubscriptionEmail) =>
      entry.email.toLowerCase(),
    ),
  )

  let newsletterSubscribed = 0
  let newsletterOptedOut = 0

  const intentTallies = new Map<string, NewsletterIntentBreakdownItem>()

  for (const member of completedMembers) {
    const email = member.email?.toLowerCase()
    if (!email) continue

    const isSubscribed = subscribedEmailSet.has(email)
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

  return {
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
  }
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
