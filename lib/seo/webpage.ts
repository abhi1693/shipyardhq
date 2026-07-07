import { siteConfig } from "@/lib/siteConfig"
import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type WebPageStructuredData = {
  "@context": "https://schema.org"
  "@type": "WebPage"
  "@id": string
  url: string
  name: string
  description?: string
  keywords?: string
  datePublished?: string
  dateModified?: string
  primaryImageOfPage?: {
    "@type": "ImageObject"
    url: string
  }
  mainEntity?: {
    "@type": string
    "@id": string
  }
}

export type BuildWebPageStructuredDataOptions = {
  /**
   * Absolute or relative URL for the page. Defaults to the site root.
   */
  url?: string
  /**
   * Convenience path relative to the site root. Ignored when `url` is provided.
   */
  path?: string
  /**
   * Optional WebPage `@id`. Defaults to `${url}#webpage`.
   */
  id?: string
  /**
   * Custom fragment appended when generating the fallback `@id`.
   */
  idFragment?: string
  /**
   * Human-readable page name. Defaults to the site tagline or brand name.
   */
  name?: string
  description?: string
  keywords?: string[]
  datePublished?: string
  dateModified?: string
  primaryImageOfPage?: string
  mainEntity?: {
    type?: string
    id: string
  }
}

const normalizePath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("/")) return trimmed
  return `/${trimmed}`
}

export function buildWebPageStructuredData(
  options: BuildWebPageStructuredDataOptions = {},
): WebPageStructuredData {
  const siteUrl = resolveSiteUrl()

  const pathUrl = options.path ? `${siteUrl}${normalizePath(options.path)}` : ""
  const rawUrl = options.url?.trim() || pathUrl || siteUrl
  const url = toAbsoluteUrlFromSite(rawUrl, siteUrl) ?? siteUrl

  const fallbackFragment = options.idFragment?.trim() || "#webpage"
  const normalizedFragment = fallbackFragment.startsWith("#")
    ? fallbackFragment
    : `#${fallbackFragment}`
  const inferredId = url.includes("#") ? url : `${url}${normalizedFragment}`
  const id = options.id?.trim() || inferredId

  const name =
    options.name?.trim() || siteConfig.tagline || siteConfig.name || "WebPage"
  const description = options.description?.trim() || siteConfig.description
  const keywordList = options.keywords?.length
    ? options.keywords
    : siteConfig.keywords
  const keywords = keywordList
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .join(", ")
  const datePublished = options.datePublished?.trim()
  const dateModified = options.dateModified?.trim()
  const primaryImageUrl = options.primaryImageOfPage
    ? toAbsoluteUrlFromSite(options.primaryImageOfPage, siteUrl)
    : undefined
  const mainEntityId = options.mainEntity?.id.trim()
  const mainEntity = mainEntityId
    ? {
        "@type": options.mainEntity?.type?.trim() || "Thing",
        "@id": mainEntityId,
      }
    : undefined

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": id,
    url,
    name,
    description,
    keywords: keywords || undefined,
    datePublished,
    dateModified,
    primaryImageOfPage: primaryImageUrl
      ? { "@type": "ImageObject", url: primaryImageUrl }
      : undefined,
    mainEntity,
  }
}

export const defaultWebPageStructuredData = buildWebPageStructuredData()
