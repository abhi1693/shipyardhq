import { siteConfig } from "@/lib/siteConfig"
import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type WebApplicationAuthor = {
  type?: "Person" | "Organization"
  name: string
  url?: string
  image?: string
}

export type WebApplicationOffer = {
  price?: number | string
  priceCurrency?: string
}

export type WebApplicationStructuredData = {
  "@context": "https://schema.org"
  "@type": "WebApplication"
  "@id": string
  url: string
  name: string
  description?: string
  datePublished?: string
  dateModified?: string
  image?: string | string[]
  screenshot?: string | string[]
  applicationCategory?: string
  operatingSystem?: string | string[]
  browserRequirements?: string
  featureList?: string | string[]
  isAccessibleForFree?: boolean
  inLanguage?: string
  offers?: {
    "@type": "Offer"
    price?: string
    priceCurrency?: string
  }
  author?: {
    "@type": "Person" | "Organization"
    name: string
    url?: string
    image?: string
  }
}

export type BuildWebApplicationStructuredDataOptions = {
  /** Absolute or relative URL. */
  url?: string
  /** Convenience path relative to the site root. Ignored when `url` is provided. */
  path?: string
  /** Override the `@id`. Defaults to `${url}#webapplication`. */
  id?: string
  /** Custom display name. */
  name?: string
  description?: string
  datePublished?: string
  dateModified?: string
  image?: string | string[]
  screenshots?: string | string[]
  applicationCategory?: string
  operatingSystem?: string | string[]
  browserRequirements?: string
  featureList?: string | string[]
  isAccessibleForFree?: boolean
  inLanguage?: string
  offers?: WebApplicationOffer
  author?: WebApplicationAuthor
}

const normalizePath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

const omitUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T

const normalizeStringArray = (value?: string | string[]) => {
  if (!value) return undefined
  const array = Array.isArray(value) ? value : [value]
  const cleaned = Array.from(
    new Set(
      array
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item?.length)),
    ),
  )
  if (!cleaned.length) return undefined
  return cleaned.length === 1 ? cleaned[0] : cleaned
}

const normalizeMediaList = (siteUrl: string, value?: string | string[]) => {
  if (!value) return undefined
  const array = Array.isArray(value) ? value : [value]
  const cleaned = Array.from(
    new Set(
      array
        .map((item) => toAbsoluteUrlFromSite(item ?? "", siteUrl))
        .filter((item): item is string => Boolean(item?.length)),
    ),
  )
  if (!cleaned.length) return undefined
  return cleaned.length === 1 ? cleaned[0] : cleaned
}

const normalizeOffer = (
  offer: WebApplicationOffer | undefined,
): WebApplicationStructuredData["offers"] => {
  if (!offer) return undefined
  const price = offer.price
  const priceCurrency = offer.priceCurrency?.trim()
  if (price === undefined || price === null || price === "") return undefined
  const priceValue =
    typeof price === "number" ? price.toString() : String(price).trim()
  if (!priceValue) return undefined
  return {
    "@type": "Offer",
    price: priceValue,
    priceCurrency,
  }
}

const normalizeAuthor = (
  siteUrl: string,
  author?: WebApplicationAuthor,
): WebApplicationStructuredData["author"] => {
  if (!author || !author.name?.trim()) return undefined
  const url = author.url
    ? toAbsoluteUrlFromSite(author.url, siteUrl)
    : undefined
  const image = author.image
    ? toAbsoluteUrlFromSite(author.image, siteUrl)
    : undefined
  return {
    "@type": author.type ?? "Person",
    name: author.name.trim(),
    ...(url ? { url } : {}),
    ...(image ? { image } : {}),
  }
}

export function buildWebApplicationStructuredData(
  options: BuildWebApplicationStructuredDataOptions = {},
): WebApplicationStructuredData {
  const siteUrl = resolveSiteUrl()
  const pathUrl = options.path ? `${siteUrl}${normalizePath(options.path)}` : ""
  const rawUrl = options.url?.trim() || pathUrl || siteUrl
  const url = toAbsoluteUrlFromSite(rawUrl, siteUrl) ?? siteUrl

  const id = options.id?.trim() || `${url}#webapplication`

  const name = options.name?.trim() || siteConfig.name
  const description = options.description?.trim() || siteConfig.description
  const datePublished = options.datePublished?.trim()
  const dateModified = options.dateModified?.trim()
  const image = normalizeMediaList(siteUrl, options.image)
  const screenshot = normalizeMediaList(siteUrl, options.screenshots)
  const applicationCategory = options.applicationCategory?.trim()
  const operatingSystem = normalizeStringArray(options.operatingSystem)
  const browserRequirements = options.browserRequirements?.trim()
  const featureList = normalizeStringArray(options.featureList)
  const isAccessibleForFree = options.isAccessibleForFree
  const inLanguage = options.inLanguage?.trim()
  const offers = normalizeOffer(options.offers)
  const author = normalizeAuthor(siteUrl, options.author)

  return omitUndefined({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": id,
    url,
    name,
    description,
    datePublished,
    dateModified,
    image,
    screenshot,
    applicationCategory,
    operatingSystem,
    browserRequirements,
    featureList,
    isAccessibleForFree,
    inLanguage,
    offers,
    author,
  })
}

export const defaultWebApplicationStructuredData =
  buildWebApplicationStructuredData()
