import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import DiscoverDigestEmail from "@/lib/email/templates/discover/digest"
import { getAppBaseUrl } from "@/lib/email/utils"
import { PlacementStatus, Prisma } from "@/lib/vendor/prisma/client"

const LOOKBACK_DAYS = 7
const FEATURED_LIMIT = 6
const FRESH_LIMIT = 6
const TRENDING_LIMIT = 6
const NEWSLETTER_LIMIT = 6

type FeaturedBadgeRow = Prisma.ProductBadgeGetPayload<{
  select: {
    product: {
      select: {
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
  const base = getAppBaseUrl()
  return `${base}/products/${slug}`
}

function buildBrowseUrl() {
  const base = getAppBaseUrl()
  return `${base}/browse`
}

function toDigestProduct(row: {
  name: string
  slug: string
  tagline: string
  publishedAt: Date | null | undefined
  category?: { name: string | null } | null
}) {
  return {
    name: row.name,
    tagline: row.tagline,
    url: buildProductUrl(row.slug),
    category: row.category?.name ?? null,
    publishedAt: row.publishedAt ?? null,
  }
}

function collectUniqueProducts<T>(
  rows: T[],
  mapProduct: (row: T) => ReturnType<typeof toDigestProduct> | null,
  seen: Set<string>,
) {
  const results: ReturnType<typeof toDigestProduct>[] = []

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
          name: true,
          slug: true,
          tagline: true,
          publishedAt: true,
          category: { select: { name: true } },
        },
      },
    },
  })) as unknown as FeaturedBadgeRow[]

  const trendingRows = await prisma.product.findMany({
    where: {
      status: "published",
      publishedAt: { gte: subtractDays(now, 30) },
    },
    orderBy: { analytics: { upvotes: "desc" } },
    take: TRENDING_LIMIT,
    select: {
      name: true,
      slug: true,
      tagline: true,
      publishedAt: true,
      category: { select: { name: true } },
    },
  })

  const freshRows = await prisma.product.findMany({
    where: {
      status: "published",
      publishedAt: { gte: subtractDays(now, LOOKBACK_DAYS) },
    },
    orderBy: { publishedAt: "desc" },
    take: FRESH_LIMIT,
    select: {
      name: true,
      slug: true,
      tagline: true,
      publishedAt: true,
      category: { select: { name: true } },
    },
  })

  const subscribers = await prisma.newsletterSubscription.findMany({
    select: { email: true },
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

  if (!subscribers.length) {
    return { sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0

  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject: `This week on Shipyard HQ`,
        react: (
          <DiscoverDigestEmail
            weekStart={weekStart}
            weekEnd={weekEnd}
            featured={featured}
            freshLaunches={freshLaunches}
            trending={trending}
            ctaUrl={buildBrowseUrl()}
          />
        ),
      })
      sent += 1
    } catch (error) {
      skipped += 1
      console.error("[email] discover digest send failed", {
        email: subscriber.email,
        error,
      })
    }
  }

  return { sent, skipped }
}
