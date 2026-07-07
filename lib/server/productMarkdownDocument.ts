import {
  alternativePath,
  categoryPath,
  productPath,
  productTypePath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { ensureUrlHasSchema } from "@/lib/utils"
import { AI_SEARCH_READY_PLAN_FEATURE_KEY } from "@/lib/constants"
import { hasPlanFeature } from "@/lib/features"

const PRODUCT_TYPE_BY_VALUE: Record<string, { slug: string; label: string }> = {
  saas: { slug: "saas", label: "SaaS" },
  browser_extension: { slug: "browser-extension", label: "Browser extension" },
  mobile_app: { slug: "mobile-app", label: "Mobile app" },
  desktop_app: { slug: "desktop-app", label: "Desktop app" },
  api: { slug: "api", label: "API" },
  open_source: { slug: "open-source", label: "Open source" },
  other: { slug: "other", label: "Other" },
}

const PRICING_MODEL_BY_VALUE: Record<string, { slug: string; label: string }> =
  {
    free: { slug: "free", label: "Free" },
    freemium: { slug: "freemium", label: "Freemium" },
    subscription: { slug: "subscription", label: "Subscription" },
    one_time: { slug: "one-time", label: "One-time" },
    custom: { slug: "custom", label: "Custom" },
  }

const PLATFORM_LABELS: Record<string, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
  chrome_extension: "Chrome extension",
}

type ProductMarkdownUser = {
  firstName?: string | null
  lastName?: string | null
}

type ProductMarkdownCategory = {
  name?: string | null
  slug?: string | null
}

export type ProductMarkdownDetail = {
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  websiteUrl?: string | null
  pricingModel?: string | null
  startingPriceCents?: number | null
  currencyCode?: string | null
  platforms?: unknown
  type?: string | null
  publishedAt?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  category?: ProductMarkdownCategory | null
  user?: ProductMarkdownUser | null
  metadata?: {
    videoUrl?: string | null
  } | null
  verification?: {
    isVerified?: boolean | null
    verifiedAt?: string | Date | null
  } | null
  analytics?: {
    upvotes?: number | null
  } | null
  _count?: {
    ProductUpvote?: number | null
  } | null
  badges?: Array<string | null> | null
  alternatives?: Array<{
    slug?: string | null
    name?: string | null
    websiteUrl?: string | null
    description?: string | null
  }> | null
  leaderboardScores?: Array<{
    rank?: number | null
    score?: number | null
    views?: number | null
    uniqueVisitors?: number | null
    upvotes?: number | null
    run?: {
      periodStart?: string | Date | null
      periodEnd?: string | Date | null
      status?: string | null
    } | null
  }> | null
  plan?: {
    assignments?: Array<{
      enabled: boolean
      feature?: {
        key?: string | null
      } | null
    }> | null
  } | null
}

export type ProductMarkdownMeta = {
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  logo?: string | null
  bannerImage?: string | null
  keywords?: Array<string | null> | null
  ProductMedia?: Array<{
    imageUrl?: string | null
  }> | null
  category?: ProductMarkdownCategory | null
}

function cleanText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null
}

function cleanMultiline(value?: string | null) {
  return value?.replace(/\r\n/g, "\n").trim() || null
}

function absoluteSiteUrl(path: string) {
  return new URL(path, siteConfig.url).toString()
}

function safeExternalUrl(value?: string | null) {
  const cleaned = cleanText(value)
  return cleaned ? ensureUrlHasSchema(cleaned) : null
}

function formatDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function formatCurrency(
  amountCents?: number | null,
  currencyCode?: string | null,
) {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) {
    return null
  }

  const currency = currencyCode || "USD"

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountCents / 100)
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`
  }
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => cleanText(value))
        .filter((value): value is string => Boolean(value)),
    ),
  )
}

function markdownList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n")
}

function markdownTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()
}

function productTypeLabel(product: ProductMarkdownDetail) {
  const type = cleanText(product.type)
  return type ? (PRODUCT_TYPE_BY_VALUE[type]?.label ?? type) : null
}

function pricingLabel(product: ProductMarkdownDetail) {
  const pricingModel = cleanText(product.pricingModel)
  return pricingModel
    ? (PRICING_MODEL_BY_VALUE[pricingModel]?.label ?? pricingModel)
    : null
}

function platformLabels(product: ProductMarkdownDetail) {
  const platforms = Array.isArray(product.platforms) ? product.platforms : []
  return uniqueValues(
    platforms.map((platform) => {
      const value = String(platform)
      return PLATFORM_LABELS[value] ?? value
    }),
  )
}

function tagLabels(product: ProductMarkdownMeta) {
  return uniqueValues(product.keywords ?? [])
}

function mediaItems(product: ProductMarkdownMeta) {
  return uniqueValues([
    product.logo,
    product.bannerImage,
    ...(product.ProductMedia ?? []).map((item) => item.imageUrl),
  ])
}

function productLinks(
  product: ProductMarkdownDetail,
  meta: ProductMarkdownMeta,
) {
  const type = cleanText(product.type)
  const pricingModel = cleanText(product.pricingModel)
  const productTypeSlug = type ? PRODUCT_TYPE_BY_VALUE[type]?.slug : null
  const pricingSlug = pricingModel
    ? PRICING_MODEL_BY_VALUE[pricingModel]?.slug
    : null
  const categorySlug = product.category?.slug ?? meta.category?.slug
  const websiteUrl = safeExternalUrl(product.websiteUrl)
  const videoUrl = safeExternalUrl(product.metadata?.videoUrl)

  return [
    `Canonical Shipyard page: ${absoluteSiteUrl(productPath(product.slug))}`,
    websiteUrl ? `Product website: ${websiteUrl}` : null,
    videoUrl ? `Video: ${videoUrl}` : null,
    categorySlug
      ? `Category: ${absoluteSiteUrl(categoryPath(categorySlug))}`
      : null,
    productTypeSlug
      ? `Product type: ${absoluteSiteUrl(productTypePath(productTypeSlug))}`
      : null,
    pricingSlug
      ? `Pricing model: ${absoluteSiteUrl(`/pricing/${pricingSlug}`)}`
      : null,
  ].filter((item): item is string => Boolean(item))
}

function factItems(product: ProductMarkdownDetail, meta: ProductMarkdownMeta) {
  const startingPrice = formatCurrency(
    product.startingPriceCents,
    product.currencyCode,
  )
  const ownerName = [product.user?.firstName, product.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  const platforms = platformLabels(product)
  const publishedDate = formatDate(product.publishedAt ?? product.createdAt)
  const updatedDate = formatDate(product.updatedAt)
  const verifiedAt = formatDate(product.verification?.verifiedAt)
  const upvotes =
    typeof product._count?.ProductUpvote === "number"
      ? product._count.ProductUpvote
      : product.analytics?.upvotes

  return [
    cleanText(product.tagline)
      ? `Tagline: ${cleanText(product.tagline)}`
      : null,
    productTypeLabel(product)
      ? `Product type: ${productTypeLabel(product)}`
      : null,
    pricingLabel(product) ? `Pricing model: ${pricingLabel(product)}` : null,
    startingPrice ? `Starting price: ${startingPrice}` : null,
    meta.category?.name ? `Category: ${meta.category.name}` : null,
    platforms.length ? `Platforms: ${platforms.join(", ")}` : null,
    publishedDate ? `Published: ${publishedDate}` : null,
    updatedDate ? `Updated: ${updatedDate}` : null,
    ownerName ? `Maker: ${ownerName}` : null,
    `Verified product: ${product.verification?.isVerified ? "yes" : "no"}`,
    verifiedAt ? `Verified at: ${verifiedAt}` : null,
    typeof upvotes === "number" ? `Upvotes: ${upvotes}` : null,
  ].filter((item): item is string => Boolean(item))
}

function alternativeItems(product: ProductMarkdownDetail) {
  return (product.alternatives ?? [])
    .map((alternative) => {
      const name = cleanText(alternative.name)
      const slug = cleanText(alternative.slug)
      if (!name || !slug) return null

      const parts = [
        `${name}: ${absoluteSiteUrl(alternativePath(slug))}`,
        safeExternalUrl(alternative.websiteUrl)
          ? `website ${safeExternalUrl(alternative.websiteUrl)}`
          : null,
        cleanText(alternative.description),
      ].filter(Boolean)

      return parts.join(" - ")
    })
    .filter((item): item is string => Boolean(item))
}

function rankHistoryRows(product: ProductMarkdownDetail) {
  return (product.leaderboardScores ?? [])
    .map((entry) => {
      const periodStart = formatDate(entry.run?.periodStart)
      const periodEnd = formatDate(entry.run?.periodEnd)
      if (!periodStart || !periodEnd) return null

      return [
        `${periodStart} to ${periodEnd}`,
        typeof entry.rank === "number" ? `#${entry.rank}` : "Unranked",
        typeof entry.score === "number" ? String(entry.score) : "",
        typeof entry.views === "number" ? String(entry.views) : "",
        typeof entry.uniqueVisitors === "number"
          ? String(entry.uniqueVisitors)
          : "",
        typeof entry.upvotes === "number" ? String(entry.upvotes) : "",
      ].map(escapeTableCell)
    })
    .filter((row): row is string[] => Boolean(row))
}

export function buildProductMarkdownDocument(
  product: ProductMarkdownDetail,
  meta: ProductMarkdownMeta,
) {
  const sections: string[] = []
  const title = cleanText(product.name) ?? cleanText(meta.name) ?? product.slug
  const description = cleanMultiline(product.description ?? meta.description)
  const tags = tagLabels(meta)
  const media = mediaItems(meta)
  const alternatives = alternativeItems(product)
  const activeBadges = uniqueValues(product.badges ?? [])
  const rankRows = rankHistoryRows(product)
  const hasAiSearchReadyProfile = hasPlanFeature(
    product.plan ?? null,
    AI_SEARCH_READY_PLAN_FEATURE_KEY,
  )

  sections.push(`# ${title}`)

  const tagline = cleanText(product.tagline ?? meta.tagline)
  if (tagline) sections.push(tagline)

  sections.push(`## Links\n\n${markdownList(productLinks(product, meta))}`)
  sections.push(`## Facts\n\n${markdownList(factItems(product, meta))}`)

  if (description) {
    sections.push(`## Description\n\n${description}`)
  }

  if (alternatives.length) {
    sections.push(`## Alternatives\n\n${markdownList(alternatives)}`)
  }

  if (activeBadges.length) {
    sections.push(`## Shipyard Badges\n\n${markdownList(activeBadges)}`)
  }

  if (rankRows.length) {
    sections.push(
      `## Rank History\n\n${markdownTable(
        ["Period", "Rank", "Score", "Views", "Unique visitors", "Upvotes"],
        rankRows,
      )}`,
    )
  }

  if (hasAiSearchReadyProfile) {
    sections.push(
      `## AI Search Profile\n\n${markdownList([
        "Structured product facts: enabled",
        "Markdown retrieval: enabled",
        "Product schema: enabled",
        "Sitemap inclusion: enabled",
        "Internal discovery links: category, pricing model, product type, and tags when available",
      ])}`,
    )
  }

  if (tags.length) {
    sections.push(`## Tags\n\n${markdownList(tags)}`)
  }

  if (media.length) {
    sections.push(`## Media\n\n${markdownList(media)}`)
  }

  return `${sections.join("\n\n")}\n`
}
