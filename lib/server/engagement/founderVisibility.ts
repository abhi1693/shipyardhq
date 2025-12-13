import prisma from "@/lib/prisma"
import { memberProductPath, productPath } from "@/lib/routes"
import { computeLeaderboardWindow } from "@/lib/server/leaderboard/v2"
import { getIsoWeekKey } from "@/lib/server/leaderboard/weeks"
import { toNovuSubscriberInput } from "@/lib/server/notifications/novu"
import {
  broadcastProductNotificationToNovuTopic,
  sendProductNotificationToNovu,
  type ProductNotificationKind,
} from "@/lib/server/notifications/novuProduct"

const DAY_MS = 86_400_000

export type FounderVisibilityAudience = "owner" | "all"

type VisibilityCandidate = {
  productId: string
  productSlug: string
  productName: string
  ownerUserId: string
  categoryId: string
  categoryName: string
  kind: ProductNotificationKind
  subject: string
  message: string
  transactionId: string
  context: Record<string, unknown>
}

export type FounderVisibilityRunResult = {
  window: {
    weekKey: string
    start: string
    end: string
    previousStart: string
    previousEnd: string
  }
  audience: FounderVisibilityAudience
  candidates: number
  sent: number
  skipped: number
  reasons: Record<string, number>
  sample: Array<Pick<VisibilityCandidate, "productSlug" | "kind" | "message">>
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

function formatDeltaLabel(previousRank: number, currentRank: number): string {
  const moved = previousRank - currentRank
  if (moved === 1) return "1 place"
  return `${moved} places`
}

function recordReason(reasons: Record<string, number>, key: string) {
  reasons[key] = (reasons[key] ?? 0) + 1
}

export async function runFounderVisibilityEngagement(options: {
  audience: FounderVisibilityAudience
  now?: Date
  topN?: number
  minMove?: number
  maxNotifications?: number
  dryRun?: boolean
}): Promise<FounderVisibilityRunResult> {
  const now = options.now ?? new Date()
  const topN = Math.max(1, options.topN ?? 10)
  const minMove = Math.max(1, options.minMove ?? 6)
  const maxNotifications =
    typeof options.maxNotifications === "number" &&
    Number.isFinite(options.maxNotifications)
      ? Math.max(0, Math.floor(options.maxNotifications))
      : 200

  const { weekKey, start, end } = getIsoWeekWindow(now)
  const previousStart = new Date(start.getTime() - 7 * DAY_MS)
  const previousEnd = start

  const [currentRows, previousRows] = await Promise.all([
    computeLeaderboardWindow({
      periodStart: start,
      periodEnd: end,
      asOf: now,
    }),
    computeLeaderboardWindow({
      periodStart: previousStart,
      periodEnd: previousEnd,
      asOf: previousEnd,
    }),
  ])

  const productIds = Array.from(
    new Set([
      ...currentRows.map((row) => row.productId),
      ...previousRows.map((row) => row.productId),
    ]),
  )

  const products = productIds.length
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
              id: true,
              clerkId: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : []

  const productById = new Map<string, (typeof products)[number]>()
  for (const product of products) {
    productById.set(product.id, product)
  }

  const currentRankByProductId = new Map<string, number>()
  for (const row of currentRows) {
    currentRankByProductId.set(row.productId, row.rank)
  }

  const previousRankMap = new Map<string, number>()
  for (const row of previousRows) {
    previousRankMap.set(row.productId, row.rank)
  }

  const currentCategoryGroups = new Map<string, string[]>()
  for (const row of currentRows) {
    const product = productById.get(row.productId)
    if (!product) continue
    const group = currentCategoryGroups.get(product.categoryId) ?? []
    group.push(row.productId)
    currentCategoryGroups.set(product.categoryId, group)
  }

  const categoryRankByProductId = new Map<string, number>()
  for (const [, groupProductIds] of currentCategoryGroups.entries()) {
    const sorted = [...groupProductIds].sort((a, b) => {
      const aRank = currentRankByProductId.get(a) ?? 0
      const bRank = currentRankByProductId.get(b) ?? 0
      if (!aRank) return 1
      if (!bRank) return -1
      return aRank - bRank
    })
    sorted.forEach((productId, index) => {
      categoryRankByProductId.set(productId, index + 1)
    })
  }

  const previousCategoryGroups = new Map<string, string[]>()
  for (const row of previousRows) {
    const product = productById.get(row.productId)
    if (!product) continue
    const group = previousCategoryGroups.get(product.categoryId) ?? []
    group.push(row.productId)
    previousCategoryGroups.set(product.categoryId, group)
  }

  const previousCategoryRankByProductId = new Map<string, number>()
  for (const [, groupProductIds] of previousCategoryGroups.entries()) {
    const sorted = [...groupProductIds].sort((a, b) => {
      const aRank = previousRankMap.get(a) ?? 0
      const bRank = previousRankMap.get(b) ?? 0
      if (!aRank) return 1
      if (!bRank) return -1
      return aRank - bRank
    })
    sorted.forEach((productId, index) => {
      previousCategoryRankByProductId.set(productId, index + 1)
    })
  }

  const reasons: Record<string, number> = {}
  const candidates: VisibilityCandidate[] = []
  const seenProducts = new Set<string>()

  for (const row of currentRows) {
    if (candidates.length >= maxNotifications) break
    if (seenProducts.has(row.productId)) continue

    const product = productById.get(row.productId)
    if (!product) continue
    if (product.user?.status !== "active") continue

    const previousRank = previousRankMap.get(row.productId) ?? null
    const categoryRank = categoryRankByProductId.get(row.productId) ?? null
    const previousCategoryRank =
      previousCategoryRankByProductId.get(row.productId) ?? null

    const isTrending =
      row.rank <= topN && (previousRank === null || previousRank > topN)
    const movedUpPlaces =
      previousRank === null ? null : Math.max(0, previousRank - row.rank)
    const movedUp =
      movedUpPlaces !== null && movedUpPlaces >= minMove && !isTrending
    const isTopCategory =
      categoryRank !== null &&
      categoryRank <= 3 &&
      (previousCategoryRank === null || previousCategoryRank > 3)

    const kind: ProductNotificationKind | null = isTopCategory
      ? "product_visibility_top_category"
      : isTrending
        ? "product_visibility_trending"
        : movedUp
          ? "product_visibility_rank_moved"
          : null

    if (!kind) continue

    const audience = options.audience
    const productLabel = audience === "owner" ? "Your product" : product.name
    const subject =
      kind === "product_visibility_top_category"
        ? audience === "owner"
          ? `You are now top ${categoryRank} in ${product.category.name}`
          : `${product.name} is now top ${categoryRank} in ${product.category.name}`
        : kind === "product_visibility_rank_moved" && previousRank !== null
          ? audience === "owner"
            ? `Your product moved up ${formatDeltaLabel(previousRank, row.rank)}`
            : `${product.name} moved up ${formatDeltaLabel(previousRank, row.rank)}`
          : audience === "owner"
            ? "Your product is trending this week"
            : `${product.name} is trending this week`

    const message =
      kind === "product_visibility_top_category"
        ? `${productLabel} is now top ${categoryRank} in ${product.category.name}.`
        : kind === "product_visibility_rank_moved" && previousRank !== null
          ? `${productLabel} moved up ${formatDeltaLabel(previousRank, row.rank)} this week (#${previousRank} → #${row.rank}).`
          : `${productLabel} is trending this week (#${row.rank}).`

    const transactionId = `${kind}:${row.productId}:${weekKey}`

    candidates.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      ownerUserId: product.userId,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      kind,
      subject,
      message,
      transactionId,
      context: {
        founder_visibility: {
          weekKey,
          window: {
            start: start.toISOString(),
            end: end.toISOString(),
            previousStart: previousStart.toISOString(),
            previousEnd: previousEnd.toISOString(),
          },
          leaderboard: {
            rank: row.rank,
            previousRank,
            movedUpPlaces,
            topN,
            minMove,
          },
          category: {
            id: product.categoryId,
            name: product.category.name,
            rank: categoryRank,
            previousRank: previousCategoryRank,
          },
        },
      },
    })

    seenProducts.add(row.productId)
  }

  let sent = 0
  let skipped = 0
  const sample: FounderVisibilityRunResult["sample"] = []

  for (const candidate of candidates) {
    sample.push({
      productSlug: candidate.productSlug,
      kind: candidate.kind,
      message: candidate.message,
    })
    if (options.dryRun) {
      recordReason(reasons, "dry-run")
      skipped += 1
      continue
    }

    if (options.audience === "all") {
      const result = await broadcastProductNotificationToNovuTopic({
        kind: candidate.kind,
        message: candidate.message,
        subject: candidate.subject,
        product: {
          id: candidate.productId,
          slug: candidate.productSlug,
          name: candidate.productName,
        },
        context: candidate.context,
        tags: ["discover", "visibility"],
        transactionId: candidate.transactionId,
      })

      if (result.sent) {
        sent += 1
        recordReason(reasons, "sent")
      } else {
        skipped += 1
        recordReason(reasons, result.reason ?? "skipped")
      }

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

    await sendProductNotificationToNovu({
      kind: candidate.kind,
      message: candidate.message,
      subject: candidate.subject,
      recipient,
      product: {
        id: candidate.productId,
        slug: candidate.productSlug,
        name: candidate.productName,
      },
      links: {
        member: memberProductPath(candidate.productSlug),
        public: productPath(candidate.productSlug),
      },
      context: candidate.context,
      transactionId: candidate.transactionId,
      tags: ["product-notifications", "visibility"],
    })

    sent += 1
    recordReason(reasons, "sent")
  }

  return {
    window: {
      weekKey,
      start: start.toISOString(),
      end: end.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    },
    audience: options.audience,
    candidates: candidates.length,
    sent,
    skipped,
    reasons,
    sample: sample.slice(0, 25),
  }
}
