import prisma from "@/lib/prisma"
import { getCachedRevenueSummary } from "@/lib/server/payments/revenue"
import { PlacementStatus, Prisma } from "@/lib/vendor/prisma/client"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sendWeeklyNewsletterTopicNotification } from "@/lib/server/notifications/novuNewsletter"
import { isNovuEnabled } from "@/lib/server/notifications/novu"

const LOOKBACK_DAYS = 7
const FEATURED_LIMIT = 6
const FRESH_LIMIT = 6
const TRENDING_LIMIT = 6
const NEWSLETTER_LIMIT = 6

type FeaturedBadgeRow = Prisma.ProductBadgeGetPayload<{
  select: {
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

async function loadRevenueLabels(products: DigestProduct[]) {
  const uniqueIds = Array.from(new Set(products.map((product) => product.id)))
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

type DigestProductRow = Parameters<typeof toDigestProduct>[0]

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

export async function sendDiscoverDigestEmails(now: Date = new Date()) {
  if (!isNovuEnabled()) {
    return { sent: 0, skipped: 0 }
  }

  const weekEnd = now
  const weekStart = subtractDays(now, LOOKBACK_DAYS - 1)

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
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: [{ startsAt: "asc" }],
    take: NEWSLETTER_LIMIT,
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

  const featuredRows = (await prisma.productBadge.findMany({
    where: {
      badge: "featured",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      product: { status: "published" },
    },
    orderBy: { createdAt: "desc" },
    take: FEATURED_LIMIT,
    select: {
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
  })) as unknown as FeaturedBadgeRow[]

  const trendingRows: DigestProductRow[] = await prisma.product.findMany({
    where: {
      status: "published",
      publishedAt: { gte: subtractDays(now, 30) },
    },
    orderBy: { analytics: { upvotes: "desc" } },
    take: TRENDING_LIMIT,
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      publishedAt: true,
      category: { select: { name: true } },
    },
  })

  const freshRows: DigestProductRow[] = await prisma.product.findMany({
    where: {
      status: "published",
      publishedAt: { gte: subtractDays(now, LOOKBACK_DAYS) },
    },
    orderBy: { publishedAt: "desc" },
    take: FRESH_LIMIT,
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      publishedAt: true,
      category: { select: { name: true } },
    },
  })

  const seenUrls = new Set<string>()

  const newsletterFeatures = collectUniqueProducts(
    newsletterPlacements,
    (row) => (row.product ? toDigestProduct(row.product) : null),
    seenUrls,
  )

  const featured = [
    ...newsletterFeatures,
    ...collectUniqueProducts(
      featuredRows,
      (row) => (row.product ? toDigestProduct(row.product) : null),
      seenUrls,
    ),
  ]

  const trending = collectUniqueProducts(
    trendingRows,
    (row) => toDigestProduct(row),
    seenUrls,
  )

  const freshLaunches = collectUniqueProducts(
    freshRows,
    (row) => toDigestProduct(row),
    seenUrls,
  )

  const revenueMap = await loadRevenueLabels([
    ...featured,
    ...trending,
    ...freshLaunches,
  ])

  const featuredWithRevenue = applyRevenueLabel(featured, revenueMap)
  const trendingWithRevenue = applyRevenueLabel(trending, revenueMap)
  const freshLaunchesWithRevenue = applyRevenueLabel(freshLaunches, revenueMap)

  const newsletterPayload = {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    featured: featuredWithRevenue.map((item) => ({
      ...item,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    })),
    trending: trendingWithRevenue.map((item) => ({
      ...item,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    })),
    fresh: freshLaunchesWithRevenue.map((item) => ({
      ...item,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    })),
    ctaUrl: buildBrowseUrl(),
  }

  const topicSent = await sendWeeklyNewsletterTopicNotification(
    newsletterPayload,
  )

  return {
    sent: topicSent ? 1 : 0,
    skipped: topicSent ? 0 : 1,
  }
}
