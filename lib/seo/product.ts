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

export type ProductOfferPricingSource = {
  pricingModel?: string | null
  startingPriceCents?: number | null
  currencyCode?: string | null
}

export type ProductFact = {
  name: string
  value: string | number | boolean
}

export type ProductRelatedEntity = {
  name: string
  url?: string
  image?: string
}

export type ProductCreator = {
  type?: "Person" | "Organization"
  name: string
  url?: string
  image?: string
}

export type ProductStructuredData = {
  "@context": "https://schema.org"
  "@type": "Product"
  "@id": string
  name: string
  description?: string
  url: string
  image?: string | string[]
  category?: string
  keywords?: string
  releaseDate?: string
  datePublished?: string
  dateModified?: string
  creator?: {
    "@type": "Person" | "Organization"
    name: string
    url?: string
    image?: string
  }
  manufacturer?: {
    "@type": "Person" | "Organization"
    name: string
    url?: string
    image?: string
  }
  brand?: {
    "@type": "Organization" | "Brand"
    name: string
    url?: string
    logo?: string
  }
  logo?: string
  sameAs?: string[]
  mainEntityOfPage?: string
  isSimilarTo?: Array<{
    "@type": "Product" | "Thing"
    name: string
    url?: string
    image?: string
  }>
  additionalProperty?: Array<{
    "@type": "PropertyValue"
    name: string
    value: string | number | boolean
  }>
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
  category?: string
  keywords?: string[]
  releaseDate?: string
  datePublished?: string
  dateModified?: string
  creator?: ProductCreator
  manufacturer?: ProductCreator
  brand?: ProductCreator
  logo?: string
  sameAs?: string[]
  mainEntityOfPage?: string
  isSimilarTo?: ProductRelatedEntity[]
  additionalProperty?: ProductFact[]
  aggregateRating?: ProductAggregateRating
  offers?: ProductOffer
}

const ZERO_PRICE_PRICING_MODELS = new Set(["free", "freemium"])

const normalizeOfferCurrency = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase()
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : "USD"
}

export function resolveProductOfferFromPricing({
  pricingModel,
  startingPriceCents,
  currencyCode,
}: ProductOfferPricingSource): ProductOffer | undefined {
  if (
    typeof startingPriceCents === "number" &&
    Number.isFinite(startingPriceCents) &&
    startingPriceCents >= 0
  ) {
    return {
      price: (startingPriceCents / 100).toFixed(2),
      priceCurrency: normalizeOfferCurrency(currencyCode),
    }
  }

  const normalizedPricingModel = pricingModel?.trim().toLowerCase()
  if (
    normalizedPricingModel &&
    ZERO_PRICE_PRICING_MODELS.has(normalizedPricingModel)
  ) {
    return {
      price: "0",
      priceCurrency: normalizeOfferCurrency(currencyCode),
    }
  }

  return undefined
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

const normalizeMedia = (
  value: string | string[] | undefined,
  siteUrl: string,
) => {
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
  const priceCurrency = offer.priceCurrency
    ? normalizeOfferCurrency(offer.priceCurrency)
    : undefined
  if (price === undefined || price === null || price === "") return undefined
  const priceString =
    typeof price === "number" ? price.toString() : String(price).trim()
  if (!priceString) return undefined
  return {
    "@type": "Offer",
    price: priceString,
    priceCurrency,
  }
}

const normalizeKeywordList = (keywords?: string[]) => {
  const cleaned = Array.from(
    new Set(
      (keywords ?? [])
        .map((keyword) => keyword?.trim())
        .filter((keyword): keyword is string => Boolean(keyword?.length)),
    ),
  )
  return cleaned.length ? cleaned.join(", ") : undefined
}

const normalizeCreator = (
  siteUrl: string,
  creator?: ProductCreator,
): ProductStructuredData["creator"] => {
  if (!creator) return undefined
  const name = creator.name.trim()
  if (!name) return undefined
  const url = creator?.url
    ? toAbsoluteUrlFromSite(creator.url, siteUrl)
    : undefined
  const image = creator?.image
    ? toAbsoluteUrlFromSite(creator.image, siteUrl)
    : undefined
  return {
    "@type": creator.type ?? "Person",
    name,
    ...(url ? { url } : {}),
    ...(image ? { image } : {}),
  }
}

const normalizeBrand = (
  siteUrl: string,
  brand?: ProductCreator,
): ProductStructuredData["brand"] => {
  if (!brand) return undefined
  const name = brand.name.trim()
  if (!name) return undefined
  const url = brand.url ? toAbsoluteUrlFromSite(brand.url, siteUrl) : undefined
  const logo = brand.image
    ? toAbsoluteUrlFromSite(brand.image, siteUrl)
    : undefined
  return {
    "@type": brand.type === "Organization" ? "Organization" : "Brand",
    name,
    ...(url ? { url } : {}),
    ...(logo ? { logo } : {}),
  }
}

const normalizeRelatedEntities = (
  siteUrl: string,
  entities?: ProductRelatedEntity[],
): ProductStructuredData["isSimilarTo"] => {
  const normalized = (entities ?? [])
    .map((entity) => {
      const name = entity.name?.trim()
      if (!name) return null
      const url = entity.url ? toAbsoluteUrlFromSite(entity.url, siteUrl) : null
      const image = entity.image
        ? toAbsoluteUrlFromSite(entity.image, siteUrl)
        : null
      return {
        "@type": "Product" as const,
        name,
        ...(url ? { url } : {}),
        ...(image ? { image } : {}),
      }
    })
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity))

  return normalized.length ? normalized : undefined
}

const normalizeAdditionalProperties = (
  facts?: ProductFact[],
): ProductStructuredData["additionalProperty"] => {
  const normalized = (facts ?? [])
    .map((fact) => {
      const name = fact.name?.trim()
      if (!name) return null
      const value =
        typeof fact.value === "string" ? fact.value.trim() : fact.value
      if (value === "") return null
      return {
        "@type": "PropertyValue" as const,
        name,
        value,
      }
    })
    .filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))

  return normalized.length ? normalized : undefined
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
  const category = options.category?.trim()
  const keywords = normalizeKeywordList(options.keywords)
  const releaseDate = options.releaseDate?.trim()
  const datePublished = options.datePublished?.trim()
  const dateModified = options.dateModified?.trim()
  const creator = normalizeCreator(siteUrl, options.creator)
  const manufacturer = normalizeCreator(siteUrl, options.manufacturer)
  const brand = normalizeBrand(siteUrl, options.brand)
  const logo = options.logo
    ? toAbsoluteUrlFromSite(options.logo, siteUrl)
    : undefined
  const sameAs = Array.from(
    new Set(
      (options.sameAs ?? [])
        .map((item) => toAbsoluteUrlFromSite(item, siteUrl))
        .filter((item): item is string => Boolean(item)),
    ),
  )
  const mainEntityOfPage = options.mainEntityOfPage
    ? (toAbsoluteUrlFromSite(options.mainEntityOfPage, siteUrl) ??
      options.mainEntityOfPage)
    : undefined
  const isSimilarTo = normalizeRelatedEntities(siteUrl, options.isSimilarTo)
  const additionalProperty = normalizeAdditionalProperties(
    options.additionalProperty,
  )
  const aggregateRating = normalizeAggregateRating(options.aggregateRating)
  const offers = normalizeOffer(options.offers)

  return omitUndefined({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": id,
    url,
    name,
    description,
    image,
    category,
    keywords,
    releaseDate,
    datePublished,
    dateModified,
    creator,
    manufacturer,
    brand,
    logo,
    sameAs: sameAs.length ? sameAs : undefined,
    mainEntityOfPage,
    isSimilarTo,
    additionalProperty,
    aggregateRating,
    offers,
  })
}

export const defaultProductStructuredData = buildProductStructuredData()
