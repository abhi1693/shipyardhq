import { siteConfig } from "@/lib/siteConfig"
import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type WebPageStructuredData = {
  "@context": "https://schema.org"
  "@type": "WebPage"
  "@id": string
  url: string
  name: string
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

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": id,
    url,
    name,
  }
}

export const defaultWebPageStructuredData = buildWebPageStructuredData()
