import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"
import { siteConfig } from "@/lib/siteConfig"

export type ProductAggregateRating = {
  ratingValue?: number | string
  ratingCount?: number
  worstRating?: number
  bestRating?: number
}

export type ProductOffer = {
  price?: number | string
  priceCurrency?: string
}

export type ProductStructuredData = {
  "@context": "https://schema.org"
  "@type": "Product"
  "@id": string
  name: string
  description?: string
  url: string
  image?: string | string[]
  aggregateRating?: {
    "@type": "AggregateRating"
    ratingValue?: string
    ratingCount?: number
    bestRating?: number
    worstRating?: number
  }
  offers?: {
    "@type": "Offer"
    price?: string
    priceCurrency?: string
  }
}

export type BuildProductStructuredDataOptions = {
  url?: string
  path?: string
  id?: string
  name?: string
  description?: string
  image?: string | string[]
  aggregateRating?: ProductAggregateRating
  offers?: ProductOffer
}

const normalizePath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

const normalizeMedia = (value: string | string[] | undefined, siteUrl: string) => {
  if (!value) return undefined
  const list = Array.isArray(value) ? value : [value]
  const unique = Array.from(
    new Set(
      list
        .map((item) => toAbsoluteUrlFromSite(item ?? "", siteUrl))
        .filter((item): item is string => Boolean(item?.length)),
    ),
  )
  if (!unique.length) return undefined
  return unique.length === 1 ? unique[0] : unique
}

const normalizeAggregateRating = (
  rating?: ProductAggregateRating,
): ProductStructuredData["aggregateRating"] => {
  if (!rating) return undefined
  const { ratingValue, ratingCount, worstRating, bestRating } = rating
  if (
    ratingValue === undefined &&
    ratingCount === undefined &&
    worstRating === undefined &&
    bestRating === undefined
  ) {
    return undefined
  }
  const ratingValueString =
    ratingValue === undefined
      ? undefined
      : typeof ratingValue === "number"
        ? ratingValue.toString()
        : String(ratingValue).trim()
  return {
    "@type": "AggregateRating",
    ratingValue: ratingValueString,
    ratingCount,
    worstRating,
    bestRating,
  }
}

const normalizeOffer = (
  offer?: ProductOffer,
): ProductStructuredData["offers"] => {
  if (!offer) return undefined
  const price = offer.price
  const priceCurrency = offer.priceCurrency?.trim()
  if (
    (price === undefined || price === null || price === "") &&
    !priceCurrency
  ) {
    return undefined
  }
  const priceString =
    price === undefined || price === null
      ? undefined
      : typeof price === "number"
        ? price.toString()
        : String(price).trim()
  return {
    "@type": "Offer",
    price: priceString,
    priceCurrency,
  }
}

export function buildProductStructuredData(
  options: BuildProductStructuredDataOptions = {},
): ProductStructuredData {
  const siteUrl = resolveSiteUrl()
  const pathUrl = options.path ? `${siteUrl}${normalizePath(options.path)}` : ""
  const rawUrl = options.url?.trim() || pathUrl || siteUrl
  const url = toAbsoluteUrlFromSite(rawUrl, siteUrl) ?? siteUrl

  const id = options.id?.trim() || `${url}#product`

  const name = options.name?.trim() || siteConfig.name
  const description = options.description?.trim() || siteConfig.description
  const image = normalizeMedia(options.image, siteUrl)
  const aggregateRating = normalizeAggregateRating(options.aggregateRating)
  const offers = normalizeOffer(options.offers)

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": id,
    url,
    name,
    description,
    image,
    aggregateRating,
    offers,
  }
}

export const defaultProductStructuredData = buildProductStructuredData()
