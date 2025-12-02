import prisma from "@/lib/prisma"
import { getCachedRevenueSummary } from "@/lib/server/payments/revenue"
import { computeLeaderboardWindow } from "@/lib/server/leaderboard/v2"
import { PlacementStatus, Prisma } from "@/lib/vendor/prisma/client"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sendWeeklyNewsletterTopicNotification } from "@/lib/server/notifications/novuNewsletter"
import { isNovuEnabled } from "@/lib/server/notifications/novu"
import { userPath } from "@/lib/routes"

const LOOKBACK_DAYS = 7
const WEEKLY_TRENDING_LIMIT = 3
const NEWSLETTER_START_WEEK = new Date(Date.UTC(2025, 8, 19)) // Sept 19, 2025

type NewsletterPlacementRow = Prisma.PlacementScheduleGetPayload<{
  include: {
    product: {
      select: {
        id: true
        name: true
        slug: true
        tagline: true
        publishedAt: true
        category: { select: { name: true } }
      }
    }
  }
}>

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
}

function buildProductUrl(slug: string) {
  const base = resolveSiteUrl()
  return `${base}/products/${slug}`
}

function buildBrowseUrl() {
  const base = resolveSiteUrl()
  return `${base}/browse`
}

function formatPublishedDate(date: Date | null | undefined): string | null {
  if (!date) return null
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatWeekRange(start: Date, end: Date) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
  const startLabel = monthDayFormatter.format(start)
  const endLabel = monthDayFormatter.format(end)
  if (sameYear) {
    return `${startLabel}-${endLabel}, ${end.getUTCFullYear()}`
  }
  const startFull = `${startLabel}, ${start.getUTCFullYear()}`
  const endFull = `${endLabel}, ${end.getUTCFullYear()}`
  return `${startFull} - ${endFull}`
}

function buildUserUrl(userId: string) {
  const base = resolveSiteUrl()
  return `${base}${userPath(userId)}`
}

function toDigestProduct(row: {
  id: string
  name: string
  slug: string
  tagline: string
  publishedAt: Date | null | undefined
  category?: { name: string | null } | null
}) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    url: buildProductUrl(row.slug),
    category: row.category?.name ?? null,
    publishedAt: row.publishedAt ?? null,
  }
}

type DigestProduct = ReturnType<typeof toDigestProduct> & {
  revenueLabel?: string | null
}

type ProductOwner = {
  id: string
  firstName: string
  lastName: string
} | null

type ProductOfTheWeek = {
  id: string
  name: string
  tagline: string
  url: string
  category: string | null
  publishedAt: string | null
  ownerName: string | null
  ownerUrl: string | null
  upvotes: number
  points: number
  revenueLabel?: string | null
}

type TrendingProduct = ProductOfTheWeek & { rank: number }

type ProductUpdateDigest = {
  id: string
  productId: string
  productName: string
  productUrl: string
  title: string
  summary: string
  description: string
  publishedAt: string | null
}

type SponsoredProduct = Omit<DigestProduct, "publishedAt"> & {
  publishedAt: string | null
}

function formatOwnerName(owner: ProductOwner): string | null {
  if (!owner) return null
  const parts = [owner.firstName, owner.lastName].filter(Boolean)
  const name = parts.join(" ").trim()
  return name.length ? name : null
}

function truncateText(value: string | null | undefined, limit = 100): string {
  if (!value) return ""
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit - 3)}...`
}

function formatRevenueLabel(
  amountCents: number,
  currencyCode: string | null | undefined,
) {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return null

  const amount = amountCents / 100
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      notation: amount >= 1000 ? "compact" : "standard",
      maximumFractionDigits: amount >= 1000 ? 1 : 0,
    })
    return `${formatter.format(amount)} revenue`
  } catch {
    return null
  }
}

async function loadRevenueLabels(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)))
  const revenueEntries = await Promise.all(
    uniqueIds.map(async (id) => {
      const summary = await getCachedRevenueSummary(id).catch(() => null)
      if (!summary) return null
      const label = formatRevenueLabel(
        summary.latestAllTimeRevenueCents,
        summary.currencyCode,
      )
      return label ? ([id, label] as const) : null
    }),
  )

  return new Map(revenueEntries.filter(Boolean) as Array<[string, string]>)
}

function applyRevenueLabel(
  products: DigestProduct[],
  revenueMap: Map<string, string>,
): DigestProduct[] {
  return products.map((product) => ({
    ...product,
    revenueLabel: revenueMap.get(product.id) ?? product.revenueLabel ?? null,
  }))
}

function collectUniqueProducts<T>(
  rows: T[],
  mapProduct: (row: T) => DigestProduct | null,
  seen: Set<string>,
) {
  const results: DigestProduct[] = []

  for (const row of rows) {
    const product = mapProduct(row)
    if (!product) continue
    if (seen.has(product.url)) continue
    seen.add(product.url)
    results.push(product)
  }

  return results
}

function computeIssueNumber(weekStart: Date): number {
  const diffMs = weekStart.getTime() - NEWSLETTER_START_WEEK.getTime()
  if (diffMs < 0) return 1
  const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return weeks + 1
}

export async function sendWeeklyNewsletterEmails(now: Date = new Date()) {
  if (!isNovuEnabled()) {
    return { sent: 0, skipped: 0 }
  }

  const weekEnd = now
  const weekStart = subtractDays(now, LOOKBACK_DAYS - 1)
  const weekKey = `${weekStart.toISOString()}_${weekEnd.toISOString()}`
  const weekRange = formatWeekRange(weekStart, weekEnd)
  const issueNumber = computeIssueNumber(weekStart)

  const newsletterPlacements = (await prisma.placementSchedule.findMany({
    where: {
      featureKey: "newsletterPromotion",
      status: {
        in: [
          PlacementStatus.active,
          PlacementStatus.pending,
          PlacementStatus.scheduled,
        ],
      },
      startsAt: { lte: weekEnd },
      endsAt: { gte: weekStart },
    },
    orderBy: [{ startsAt: "asc" }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          publishedAt: true,
          category: { select: { name: true } },
        },
      },
    },
  })) as unknown as NewsletterPlacementRow[]

  const newsletterProducts = collectUniqueProducts(
    newsletterPlacements,
    (row) => (row.product ? toDigestProduct(row.product) : null),
    new Set<string>(),
  )

  const leaderboardRows = await computeLeaderboardWindow({
    periodStart: weekStart,
    periodEnd: weekEnd,
    limit: WEEKLY_TRENDING_LIMIT,
    asOf: now,
  })

  const leaderboardProductIds = leaderboardRows.map((row) => row.productId)

  const leaderboardProducts: Array<{
    id: string
    name: string
    slug: string
    tagline: string
    publishedAt: Date | null
    category: { name: string | null } | null
    user: { id: string; firstName: string; lastName: string } | null
  }> = leaderboardProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: leaderboardProductIds }, status: "published" },
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          publishedAt: true,
          category: { select: { name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      })
    : []

  const leaderboardProductMap = new Map(
    leaderboardProducts.map((product) => [product.id, product]),
  )

  const trendingProducts: TrendingProduct[] = leaderboardRows
    .map((row, index) => {
      const product = leaderboardProductMap.get(row.productId)
      if (!product) return null
      const owner = product.user ?? null
      return {
        id: product.id,
        name: product.name,
        tagline: product.tagline,
        url: buildProductUrl(product.slug),
        category: product.category?.name ?? null,
        publishedAt: formatPublishedDate(product.publishedAt),
        ownerName: formatOwnerName(owner),
        ownerUrl: owner ? buildUserUrl(owner.id) : null,
        upvotes: row.upvotes,
        points: row.score,
        rank: row.rank ?? index + 1,
      }
    })
    .filter((product): product is TrendingProduct => Boolean(product))

  const updates: Array<{
    id: string
    title: string
    summary: string | null
    content: string
    publishedAt: Date | null
    product: { id: string; name: string; slug: string } | null
  }> = await prisma.productUpdate.findMany({
    where: {
      status: "published",
      publishedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      publishedAt: true,
      product: {
        select: { id: true, name: true, slug: true },
      },
    },
  })

  const productUpdates: ProductUpdateDigest[] = updates
    .map((update) => {
      if (!update.product) return null
      const snippet = truncateText(update.content, 100)
      const summary = update.summary?.trim() || snippet
      return {
        id: update.id,
        productId: update.product.id,
        productName: update.product.name,
        productUrl: buildProductUrl(update.product.slug),
        title: update.title,
        summary,
        description: snippet,
        publishedAt: formatPublishedDate(update.publishedAt),
      }
    })
    .filter((update): update is ProductUpdateDigest =>
      Boolean(update?.productId && update?.title),
    )

  const revenueIds = new Set<string>()
  newsletterProducts.forEach((product) => revenueIds.add(product.id))
  leaderboardProducts.forEach((product) => revenueIds.add(product.id))
  const revenueMap = await loadRevenueLabels(Array.from(revenueIds))

  const sponsoredProductsWithRevenue: SponsoredProduct[] = applyRevenueLabel(
    newsletterProducts,
    revenueMap,
  ).map((item) => ({
    ...item,
    publishedAt: formatPublishedDate(item.publishedAt),
  }))

  const trendingProductsWithRevenue: TrendingProduct[] = trendingProducts.map(
    (product) => ({
      ...product,
      revenueLabel: revenueMap.get(product.id) ?? null,
    }),
  )

  const productOfTheWeek: ProductOfTheWeek | null =
    trendingProductsWithRevenue.length > 0
      ? (() => {
          const { rank: _rank, ...rest } = trendingProductsWithRevenue[0]
          return rest
        })()
      : null

  const newsletterPayload = {
    weekRange,
    issueNumber,
    ctaUrl: buildBrowseUrl(),
    sponsoredProducts: sponsoredProductsWithRevenue,
    productOfTheWeek,
    trending: trendingProductsWithRevenue,
    productUpdates,
  }

  const topicSent = await sendWeeklyNewsletterTopicNotification(
    newsletterPayload,
    weekKey,
  )

  return {
    sent: topicSent ? 1 : 0,
    skipped: topicSent ? 0 : 1,
  }
}
