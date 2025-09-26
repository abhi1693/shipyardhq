import { PRODUCT_TYPES, PRICING_MODELS, PLATFORMS } from "./constants"
import { validateSingleEmail } from "@/lib/email/list-parser"

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
  githubUrl?: string | null
  twitterUrl?: string | null
  demoUrl?: string | null
  contactEmail?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
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
  githubUrl?: string
  twitterUrl?: string
  demoUrl?: string
  contactEmail?: string
  ctaLabel?: string
  ctaUrl?: string
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
  "freemium": "freemium",
  "subscription": "subscription",
  "monthly": "subscription",
  "annual": "subscription",
  "annually": "subscription",
  "yearly": "subscription",
  "per month": "subscription",
  "per year": "subscription",
  "one-time": "one_time",
  "one time": "one_time",
  "lifetime": "one_time",
  "custom": "custom",
  "contact us": "custom",
  "sales": "custom",
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
    const normalized = str.replace(/[\s]{2,}/g, " ")
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase())
      keywords.push(normalized)
    }
  }
  return keywords.length ? keywords : undefined
}

function normalizeEmail(value?: string | null) {
  const str = normalizeString(value)
  if (!str) return undefined
  return validateSingleEmail(str) ? str : undefined
}

export function normalizeProductAutofill(
  raw: ProductAutofillModelOutput,
): ProductAutofillNormalizationResult {
  const warnings: string[] = []
  const suggestion: ProductAutofillSuggestion = {}

  const name = normalizeString(raw.name)
  if (name) suggestion.name = name

  const tagline = normalizeString(raw.tagline)
  if (tagline) suggestion.tagline = tagline

  const description = normalizeString(raw.description)
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

  const demoUrl = sanitizeUrl(raw.demoUrl)
  if (demoUrl) {
    suggestion.demoUrl = demoUrl
  } else if (raw.demoUrl) {
    warnings.push("demoUrl rejected: invalid URL")
  }

  const ctaUrl = sanitizeUrl(raw.ctaUrl)
  if (ctaUrl) {
    suggestion.ctaUrl = ctaUrl
  } else if (raw.ctaUrl) {
    warnings.push("ctaUrl rejected: invalid URL")
  }

  const ctaLabel = normalizeString(raw.ctaLabel)
  if (ctaLabel) suggestion.ctaLabel = ctaLabel

  const contactEmail = normalizeEmail(raw.contactEmail)
  if (contactEmail) {
    suggestion.contactEmail = contactEmail
  } else if (raw.contactEmail) {
    warnings.push("contactEmail rejected: invalid email")
  }

  return { suggestion, warnings }
}
