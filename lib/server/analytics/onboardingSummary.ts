import { subDays } from "date-fns"

import prisma from "@/lib/prisma"
import type {
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

  const [
    totalActiveUsers,
    completedResponses,
    roleIntentGroups,
    heardFromGroups,
    completedLast7Days,
    latestCompleted,
  ] = await Promise.all([
    prisma.user.count({ where: activeWhere }),
    prisma.user.count({ where: completedWhere }),
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
        OR: [
          { termsAcceptedAt: { gte: oneWeekAgo } },
          {
            AND: [
              { termsAcceptedAt: null },
              { updatedAt: { gte: oneWeekAgo } },
            ],
          },
        ],
      },
    }),
    prisma.user.findFirst({
      where: completedWhere,
      orderBy: [
        { termsAcceptedAt: "desc" },
        { updatedAt: "desc" },
      ],
      select: {
        termsAcceptedAt: true,
        updatedAt: true,
      },
    }),
  ])

  const roleIntentEntries = roleIntentGroups
    .filter((group) => group.roleIntent)
    .map((group) => ({
      value: group.roleIntent as string,
      count: group._count.roleIntent,
    }))

  const heardFromEntries = heardFromGroups
    .filter((group) => group.heardFrom)
    .map((group) => ({
      value: group.heardFrom as string,
      count: group._count.heardFrom,
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

  const lastResponseAt = latestCompleted
    ? (latestCompleted.termsAcceptedAt ?? latestCompleted.updatedAt)?.toISOString() ?? null
    : null

  return {
    totalActiveUsers,
    completedResponses,
    completionRate,
    pendingUsers,
    completedLast7Days,
    lastResponseAt,
    roleIntentBreakdown,
    heardFromBreakdown,
  }
}
