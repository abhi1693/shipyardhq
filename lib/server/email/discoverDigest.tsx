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

type NewsletterTemplateInput = {
  weekStart: Date
  weekEnd: Date
  featured: DigestProduct[]
  trending: DigestProduct[]
  fresh: DigestProduct[]
  ctaUrl: string
}

function formatDateRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const startStr = start.toLocaleDateString("en-US", opts)
  const endStr = end.toLocaleDateString("en-US", opts)
  return `${startStr} – ${endStr}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderSection(title: string, products: DigestProduct[]) {
  if (!products.length) return ""
  const items = products
    .map((product) => {
      const name = escapeHtml(product.name)
      const tagline = escapeHtml(product.tagline)
      const url = escapeHtml(product.url)
      const revenue = product.revenueLabel
        ? `<div style="font-size:13px;color:#065f46;margin-top:4px;">${escapeHtml(product.revenueLabel)}</div>`
        : ""
      const category = product.category
        ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${escapeHtml(product.category)}</div>`
        : ""
      return `<li style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
        <a href="${url}" style="color:#111827;font-weight:700;font-size:16px;text-decoration:none;">${name}</a>
        <div style="color:#374151;font-size:14px;margin-top:4px;line-height:1.5;">${tagline}</div>
        ${category}
        ${revenue}
      </li>`
    })
    .join("\n")

  return `
    <h3 style="font-size:18px;font-weight:700;color:#111827;margin:16px 0 8px;">${escapeHtml(
      title,
    )}</h3>
    <ul style="list-style:none;padding:0;margin:0;">${items}</ul>
  `
}

function buildNewsletterHtml(input: NewsletterTemplateInput) {
  const range = formatDateRange(input.weekStart, input.weekEnd)
  return `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">This week on Shipyard HQ</h1>
    <div style="color:#6b7280;font-size:14px;margin-bottom:16px;">${range}</div>
    <div style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:20px;">
      Featured launches, fresh listings, and trending products from the last week.
    </div>
    <div style="margin-bottom:20px;">
      <a href="${escapeHtml(
        input.ctaUrl,
      )}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:15px;">Browse products</a>
    </div>
    ${renderSection("Featured", input.featured)}
    ${renderSection("Trending", input.trending)}
    ${renderSection("Fresh launches", input.fresh)}
    <div style="margin-top:20px;">
      <a href="${escapeHtml(
        input.ctaUrl,
      )}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:15px;">See more on Shipyard</a>
    </div>
  `
}

function buildNewsletterText(input: NewsletterTemplateInput) {
  const range = formatDateRange(input.weekStart, input.weekEnd)
  const lines: string[] = []
  lines.push("This week on Shipyard HQ")
  lines.push(range, "")

  const append = (title: string, list: DigestProduct[]) => {
    if (!list.length) return
    lines.push(title + ":")
    for (const item of list) {
      const revenue = item.revenueLabel ? ` — ${item.revenueLabel}` : ""
      const category = item.category ? ` [${item.category}]` : ""
      lines.push(`• ${item.name}${category}${revenue}`)
      lines.push(`  ${item.tagline}`)
      lines.push(`  ${item.url}`)
    }
    lines.push("")
  }

  append("Featured", input.featured)
  append("Trending", input.trending)
  append("Fresh launches", input.fresh)
  lines.push("Browse more:")
  lines.push(input.ctaUrl)

  return lines.join("\n")
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

  const htmlTemplate = buildNewsletterHtml({
    weekStart,
    weekEnd,
    featured: featuredWithRevenue,
    trending: trendingWithRevenue,
    fresh: freshLaunchesWithRevenue,
    ctaUrl: buildBrowseUrl(),
  })

  const textTemplate = buildNewsletterText({
    weekStart,
    weekEnd,
    featured: featuredWithRevenue,
    trending: trendingWithRevenue,
    fresh: freshLaunchesWithRevenue,
    ctaUrl: buildBrowseUrl(),
  })

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
    html: htmlTemplate,
    text: textTemplate,
  }

  const topicSent = await sendWeeklyNewsletterTopicNotification(
    newsletterPayload,
  )

  return {
    sent: topicSent ? 1 : 0,
    skipped: topicSent ? 0 : 1,
  }
}
