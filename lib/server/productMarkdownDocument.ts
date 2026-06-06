import { categoryPath, productPath, productTypePath } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { ensureUrlHasSchema } from "@/lib/utils"

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
    demoUrl?: string | null
  } | null
  verification?: {
    isVerified?: boolean | null
  } | null
  _count?: {
    ProductUpvote?: number | null
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
  const demoUrl = safeExternalUrl(product.metadata?.demoUrl)

  return [
    `Canonical Shipyard page: ${absoluteSiteUrl(productPath(product.slug))}`,
    websiteUrl ? `Product website: ${websiteUrl}` : null,
    demoUrl ? `Demo: ${demoUrl}` : null,
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
    typeof product._count?.ProductUpvote === "number"
      ? `Upvotes: ${product._count.ProductUpvote}`
      : null,
  ].filter((item): item is string => Boolean(item))
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

  sections.push(`# ${title}`)

  const tagline = cleanText(product.tagline ?? meta.tagline)
  if (tagline) sections.push(tagline)

  sections.push(`## Links\n\n${markdownList(productLinks(product, meta))}`)
  sections.push(`## Facts\n\n${markdownList(factItems(product, meta))}`)

  if (description) {
    sections.push(`## Description\n\n${description}`)
  }

  if (tags.length) {
    sections.push(`## Tags\n\n${markdownList(tags)}`)
  }

  if (media.length) {
    sections.push(`## Media\n\n${markdownList(media)}`)
  }

  return `${sections.join("\n\n")}\n`
}
