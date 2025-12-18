import prisma from "@/lib/prisma"
import { computeLeaderboardWindow } from "@/lib/server/leaderboard/v2"
import {
  getIsoWeekKey,
  getIsoWeekYearAndNumber,
} from "@/lib/server/leaderboard/weeks"
import { toNovuSubscriberInput } from "@/lib/server/notifications/novu"
import { sendWeeklyMicroLeaderboardNudgeNotification } from "@/lib/server/notifications/novuLeaderboard"
import { resolveSiteUrl } from "@/lib/siteConfig"

const DAY_MS = 86_400_000

export type MicroLeaderboardMode = "midweek"

type LeaderboardProduct = {
  id: string
  slug: string
  name: string
  userId: string
  categoryId: string
  user: {
    clerkId: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    status: string | null
  } | null
  category: {
    id: string
    name: string
    slug: string
  }
}

type MicroLeaderboardCandidate = {
  productId: string
  productSlug: string
  productName: string
  ownerUserId: string
  category: LeaderboardProduct["category"]
  overallRank: number
  categoryRank: number
}

export type MicroLeaderboardRunResult = {
  mode: MicroLeaderboardMode
  weekKey: string
  window: { start: string; end: string }
  candidates: number
  sent: number
  skipped: number
  reasons: Record<string, number>
  sample: Array<
    Pick<
      MicroLeaderboardCandidate,
      "productSlug" | "categoryRank" | "overallRank"
    >
  >
}

function getIsoWeekWindow(now: Date): {
  weekKey: string
  start: Date
  end: Date
} {
  const startOfDay = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  )
  const isoDayIndex = (startOfDay.getUTCDay() + 6) % 7
  const start = new Date(startOfDay.getTime() - isoDayIndex * DAY_MS)
  const end = new Date(start.getTime() + 7 * DAY_MS)
  return { weekKey: getIsoWeekKey(start), start, end }
}

function recordReason(reasons: Record<string, number>, key: string) {
  reasons[key] = (reasons[key] ?? 0) + 1
}

function buildWeeklyLeaderboardUrl(
  weekStart: Date,
  categorySlug: string,
): string {
  const siteUrl = resolveSiteUrl()
  const { year, week } = getIsoWeekYearAndNumber(weekStart)
  const url = new URL(`/leaderboard/weekly/${year}/${week}`, `${siteUrl}/`)
  url.searchParams.set("category", categorySlug)
  return url.toString()
}

export async function runMicroLeaderboardEngagement(options: {
  mode: MicroLeaderboardMode
  now?: Date
  rankMin?: number
  rankMax?: number
  maxNotifications?: number
  dryRun?: boolean
}): Promise<MicroLeaderboardRunResult> {
  const mode = options.mode
  const now = options.now ?? new Date()

  const currentWindow = getIsoWeekWindow(now)
  const window = currentWindow

  const rankMin = Math.max(1, Math.floor(options.rankMin ?? 2))
  const rankMax = Math.max(rankMin, Math.floor(options.rankMax ?? 5))
  const maxNotifications =
    typeof options.maxNotifications === "number" &&
    Number.isFinite(options.maxNotifications)
      ? Math.max(0, Math.floor(options.maxNotifications))
      : 200

  const leaderboardRows = await computeLeaderboardWindow({
    periodStart: window.start,
    periodEnd: window.end,
    asOf: now,
  })

  const rankByProductId = new Map<string, number>()
  for (const row of leaderboardRows) {
    rankByProductId.set(row.productId, row.rank)
  }

  const productIds = leaderboardRows.map((row) => row.productId)
  const products: LeaderboardProduct[] = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, status: "published" },
        select: {
          id: true,
          slug: true,
          name: true,
          userId: true,
          categoryId: true,
          user: {
            select: {
              clerkId: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          category: { select: { id: true, name: true, slug: true } },
        },
      })
    : []

  const productById = new Map<string, LeaderboardProduct>()
  for (const product of products) {
    productById.set(product.id, product)
  }

  const categoryGroups = new Map<string, string[]>()
  for (const row of leaderboardRows) {
    const product = productById.get(row.productId)
    if (!product) continue
    const group = categoryGroups.get(product.categoryId) ?? []
    group.push(row.productId)
    categoryGroups.set(product.categoryId, group)
  }

  const categoryRankByProductId = new Map<string, number>()
  for (const [, groupProductIds] of categoryGroups.entries()) {
    const sorted = [...groupProductIds].sort((a, b) => {
      const aRank = rankByProductId.get(a) ?? 0
      const bRank = rankByProductId.get(b) ?? 0
      if (!aRank) return 1
      if (!bRank) return -1
      return aRank - bRank
    })
    sorted.forEach((productId, index) => {
      categoryRankByProductId.set(productId, index + 1)
    })
  }

  const candidates: MicroLeaderboardCandidate[] = []
  const reasons: Record<string, number> = {}

  for (const row of leaderboardRows) {
    const product = productById.get(row.productId)
    if (!product) continue
    if (product.user?.status !== "active") continue

    const categoryRank = categoryRankByProductId.get(product.id)
    if (!categoryRank) continue
    if (categoryRank < rankMin || categoryRank > rankMax) continue

    candidates.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      ownerUserId: product.userId,
      category: product.category,
      overallRank: row.rank,
      categoryRank,
    })
  }

  candidates.sort((a, b) => {
    if (a.categoryRank !== b.categoryRank)
      return a.categoryRank - b.categoryRank
    if (a.overallRank !== b.overallRank) return a.overallRank - b.overallRank
    return a.productId.localeCompare(b.productId)
  })

  const selected = candidates.slice(0, maxNotifications)
  const sample = selected.slice(0, 25).map((candidate) => ({
    productSlug: candidate.productSlug,
    categoryRank: candidate.categoryRank,
    overallRank: candidate.overallRank,
  }))

  let sent = 0
  let skipped = 0

  for (const candidate of selected) {
    if (options.dryRun) {
      skipped += 1
      recordReason(reasons, "dry-run")
      continue
    }

    const product = productById.get(candidate.productId)
    if (!product) {
      skipped += 1
      recordReason(reasons, "missing-product")
      continue
    }

    const recipient = toNovuSubscriberInput({
      subscriberId: product.user?.clerkId,
      email: product.user?.email,
      firstName: product.user?.firstName,
      lastName: product.user?.lastName,
    })
    if (!recipient) {
      skipped += 1
      recordReason(reasons, "missing-recipient")
      continue
    }

    const leaderboardUrl = buildWeeklyLeaderboardUrl(
      window.start,
      product.category.slug,
    )

    await sendWeeklyMicroLeaderboardNudgeNotification({
      recipient,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      weekKey: window.weekKey,
      category: product.category,
      rank: candidate.categoryRank,
      leaderboardUrl,
    })

    sent += 1
    recordReason(reasons, "sent")
  }

  return {
    mode,
    weekKey: window.weekKey,
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
    },
    candidates: selected.length,
    sent,
    skipped,
    reasons,
    sample,
  }
}
