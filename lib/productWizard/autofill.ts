import { PRODUCT_TYPES, PRICING_MODELS, PLATFORMS } from "./constants"
import { validateSingleEmail } from "@/lib/emailValidation"

const MAX_TAGLINE_LENGTH = 110
const MAX_DESCRIPTION_LENGTH = 2400
const MAX_KEYWORDS = 6
const GENERIC_KEYWORDS = new Set([
  "app",
  "apps",
  "platform",
  "product",
  "products",
  "productivity",
  "saas",
  "software",
  "solution",
  "startup",
  "tool",
  "tools",
])

export type ProductAutofillModelOutput = {
  name?: string | null
  tagline?: string | null
  description?: string | null
  logoUrl?: string | null
  productType?: string | null
  pricingModel?: string | null
  startingPriceCents?: number | null
  currencyCode?: string | null
  keywords?: string[] | null
  platforms?: string[] | null
  categoryName?: string | null
  categoryNames?: string[] | null
  githubUrl?: string | null
  twitterUrl?: string | null
  videoUrl?: string | null
  contactEmail?: string | null
  alternativeIds?: string[] | null
}

export type ProductAutofillSuggestion = {
  name?: string
  tagline?: string
  description?: string
  logo?: string
  type?: (typeof PRODUCT_TYPES)[number]
  pricingModel?: (typeof PRICING_MODELS)[number]
  startingPriceCents?: number
  currencyCode?: string
  keywords?: string[]
  platforms?: (typeof PLATFORMS)[number][]
  categoryName?: string
  categoryNames?: string[]
  githubUrl?: string
  twitterUrl?: string
  videoUrl?: string
  contactEmail?: string
  alternativeIds?: string[]
}

export type ProductAutofillNormalizationResult = {
  suggestion: ProductAutofillSuggestion
  warnings: string[]
}

const TYPE_SYNONYMS: Record<string, (typeof PRODUCT_TYPES)[number]> = {
  saas: "saas",
  "software as a service": "saas",
  "web app": "saas",
  "web application": "saas",
  "browser extension": "browser_extension",
  "chrome extension": "browser_extension",
  "firefox extension": "browser_extension",
  "edge extension": "browser_extension",
  "mobile app": "mobile_app",
  ios: "mobile_app",
  android: "mobile_app",
  "ios app": "mobile_app",
  "android app": "mobile_app",
  "desktop app": "desktop_app",
  "desktop application": "desktop_app",
  "mac app": "desktop_app",
  macos: "desktop_app",
  windows: "desktop_app",
  linux: "desktop_app",
  api: "api",
  "rest api": "api",
  "graphql api": "api",
  "open source": "open_source",
  "open-source": "open_source",
  oss: "open_source",
}

const PRICING_SYNONYMS: Record<string, (typeof PRICING_MODELS)[number]> = {
  free: "free",
  "no cost": "free",
  freemium: "freemium",
  subscription: "subscription",
  monthly: "subscription",
  annual: "subscription",
  annually: "subscription",
  yearly: "subscription",
  "per month": "subscription",
  "per year": "subscription",
  "one-time": "one_time",
  "one time": "one_time",
  lifetime: "one_time",
  custom: "custom",
  "contact us": "custom",
  sales: "custom",
}

const PLATFORM_SYNONYMS: Record<string, (typeof PLATFORMS)[number]> = {
  web: "web",
  "web app": "web",
  browser: "web",
  "progressive web app": "web",
  ios: "ios",
  iphone: "ios",
  ipad: "ios",
  android: "android",
  "google play": "android",
  "play store": "android",
  mac: "mac",
  macos: "mac",
  windows: "windows",
  win32: "windows",
  linux: "linux",
  "chrome extension": "chrome_extension",
  "chrome web store": "chrome_extension",
  "firefox extension": "firefox_extension",
  "firefox add-on": "firefox_extension",
}

function normalizeString(value?: string | null) {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function truncateAtBoundary(value: string, maxLength: number) {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  const truncated = trimmed.slice(0, maxLength)
  const boundary = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("\n"),
    truncated.lastIndexOf(" "),
  )
  const candidate =
    boundary > Math.floor(maxLength * 0.65)
      ? truncated.slice(0, boundary).trim()
      : truncated.trim()
  return candidate.replace(/[,\-:;]+$/, "").trim()
}

function normalizeTagline(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  return truncateAtBoundary(str.replace(/\s+/g, " "), MAX_TAGLINE_LENGTH)
}

function normalizeDescription(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  const withoutH1 = str
    .replace(/(^|\n)\s*#(?!#)\s*/g, "$1## ")
    .replace(/\n{3,}/g, "\n\n")
  return truncateAtBoundary(withoutH1, MAX_DESCRIPTION_LENGTH)
}

function sanitizeUrl(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  try {
    const url = new URL(str)
    if (!["http:", "https:"].includes(url.protocol)) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function normalizeProductType(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  const lower = str.toLowerCase()
  const exact = (PRODUCT_TYPES as readonly string[]).find((t) => t === lower)
  if (exact) return exact as (typeof PRODUCT_TYPES)[number]
  for (const [needle, mapped] of Object.entries(TYPE_SYNONYMS)) {
    if (lower.includes(needle)) {
      return mapped
    }
  }
  return undefined
}

function normalizePricingModel(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  const lower = str.toLowerCase()
  const exact = (PRICING_MODELS as readonly string[]).find((t) => t === lower)
  if (exact) return exact as (typeof PRICING_MODELS)[number]
  for (const [needle, mapped] of Object.entries(PRICING_SYNONYMS)) {
    if (lower.includes(needle)) {
      return mapped
    }
  }
  return undefined
}

function normalizePlatforms(values?: string[] | null) {
  if (!values?.length) return undefined
  const normalized = new Set<(typeof PLATFORMS)[number]>()
  for (const raw of values) {
    const str = normalizeString(raw)
    if (!str) continue
    const lower = str.toLowerCase()
    const exact = (PLATFORMS as readonly string[]).find((p) => p === lower)
    if (exact) {
      normalized.add(exact as (typeof PLATFORMS)[number])
      continue
    }
    for (const [needle, mapped] of Object.entries(PLATFORM_SYNONYMS)) {
      if (lower.includes(needle)) {
        normalized.add(mapped)
        break
      }
    }
  }
  return normalized.size ? Array.from(normalized) : undefined
}

function normalizeCurrency(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  const upper = str.toUpperCase()
  return /^[A-Z]{3}$/.test(upper) ? upper : undefined
}

function normalizeKeywords(values?: string[] | null) {
  if (!values?.length) return undefined
  const keywords: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    const str = normalizeString(raw)
    if (!str) continue
    const normalized = str
      .toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^\p{L}\p{N}\s+./-]/gu, "")
      .replace(/[\s]{2,}/g, " ")
      .trim()
    if (!normalized) continue
    if (GENERIC_KEYWORDS.has(normalized)) continue
    const wordCount = normalized.split(/\s+/).filter(Boolean).length
    if (wordCount > 4 || normalized.length > 48) continue
    if (!seen.has(normalized)) {
      seen.add(normalized)
      keywords.push(normalized)
      if (keywords.length === MAX_KEYWORDS) break
    }
  }
  return keywords.length ? keywords : undefined
}

function normalizeCategoryNames(values?: (string | null | undefined)[] | null) {
  if (!values?.length) return undefined
  const names: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    const str = normalizeString(raw)
    if (!str) continue
    const normalized = str.replace(/[\s]{2,}/g, " ")
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(normalized)
    if (names.length === 3) break
  }
  return names.length ? names : undefined
}

function normalizeEmail(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  return validateSingleEmail(str) ? str : undefined
}

function normalizeAlternativeIds(values?: string[] | null) {
  if (!values?.length) return undefined
  const ids = new Set<string>()
  for (const raw of values) {
    const str = normalizeString(raw)
    if (str) ids.add(str)
  }
  return ids.size ? Array.from(ids) : undefined
}

export function normalizeProductAutofill(
  raw: ProductAutofillModelOutput,
): ProductAutofillNormalizationResult {
  const warnings: string[] = []
  const suggestion: ProductAutofillSuggestion = {}

  const name = normalizeString(raw.name)
  if (name) suggestion.name = name

  const tagline = normalizeTagline(raw.tagline)
  if (tagline) suggestion.tagline = tagline

  const description = normalizeDescription(raw.description)
  if (description) suggestion.description = description

  const logo = sanitizeUrl(raw.logoUrl)
  if (logo) {
    suggestion.logo = logo
  } else if (raw.logoUrl) {
    warnings.push("logoUrl rejected: invalid URL")
  }

  const type = normalizeProductType(raw.productType)
  if (type) {
    suggestion.type = type
  } else if (raw.productType) {
    warnings.push(`productType ignored: ${raw.productType}`)
  }

  const pricingModel = normalizePricingModel(raw.pricingModel)
  if (pricingModel) {
    suggestion.pricingModel = pricingModel
  } else if (raw.pricingModel) {
    warnings.push(`pricingModel ignored: ${raw.pricingModel}`)
  }

  if (typeof raw.startingPriceCents === "number") {
    const cents = Math.max(0, Math.round(raw.startingPriceCents))
    if (cents > 0) {
      suggestion.startingPriceCents = cents
    }
  }

  const currency = normalizeCurrency(raw.currencyCode)
  if (currency) {
    suggestion.currencyCode = currency
  } else if (raw.currencyCode) {
    warnings.push(`currencyCode ignored: ${raw.currencyCode}`)
  }

  const keywords = normalizeKeywords(raw.keywords)
  if (keywords) suggestion.keywords = keywords

  const platforms = normalizePlatforms(raw.platforms)
  if (platforms) suggestion.platforms = platforms

  const categoryName = normalizeString(raw.categoryName)
  if (categoryName) suggestion.categoryName = categoryName
  const categoryNames = normalizeCategoryNames([
    ...(raw.categoryNames ?? []),
    raw.categoryName,
  ])
  if (categoryNames) suggestion.categoryNames = categoryNames

  const githubUrl = sanitizeUrl(raw.githubUrl)
  if (githubUrl) {
    suggestion.githubUrl = githubUrl
  } else if (raw.githubUrl) {
    warnings.push("githubUrl rejected: invalid URL")
  }

  const twitterUrl = sanitizeUrl(raw.twitterUrl)
  if (twitterUrl) {
    suggestion.twitterUrl = twitterUrl
  } else if (raw.twitterUrl) {
    warnings.push("twitterUrl rejected: invalid URL")
  }

  const videoUrl = sanitizeUrl(raw.videoUrl)
  if (videoUrl) {
    suggestion.videoUrl = videoUrl
  } else if (raw.videoUrl) {
    warnings.push("videoUrl rejected: invalid URL")
  }

  const contactEmail = normalizeEmail(raw.contactEmail)
  if (contactEmail) {
    suggestion.contactEmail = contactEmail
  } else if (raw.contactEmail) {
    warnings.push("contactEmail rejected: invalid email")
  }

  const alternativeIds = normalizeAlternativeIds(raw.alternativeIds)
  if (alternativeIds) {
    suggestion.alternativeIds = alternativeIds
  }

  return { suggestion, warnings }
}
