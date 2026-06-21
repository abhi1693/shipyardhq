import { BROWSE_PATH } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type WebSiteStructuredData = {
  "@context": "https://schema.org"
  "@type": "WebSite"
  "@id": string
  url: string
  name: string
  description?: string
  keywords?: string
  potentialAction?: {
    "@type": "SearchAction"
    target: string
    "query-input": {
      "@type": "PropertyValueSpecification"
      valueRequired: string
      valueName: string
    }
  }
}

export type BuildWebSiteStructuredDataOptions = {
  url?: string
  id?: string
  name?: string
  description?: string
  keywords?: string[]
  search?: {
    enabled?: boolean
    /**
     * Absolute or relative URL template for the search target. Use `{search_term_string}` as the placeholder.
     */
    target?: string
    /**
     * Convenience path that will append `?param={search_term_string}` automatically.
     */
    path?: string
    /**
     * Query parameter name used when constructing the target from `path`.
     */
    param?: string
  }
}

const DEFAULT_SEARCH_PARAM = "q" as const
const SEARCH_PLACEHOLDER = "search_term_string" as const

const buildQueryInput = () => ({
  "@type": "PropertyValueSpecification" as const,
  valueRequired: "http://schema.org/True",
  valueName: SEARCH_PLACEHOLDER,
})

const buildSearchAction = (
  siteUrl: string,
  options?: BuildWebSiteStructuredDataOptions["search"],
) => {
  const enabled = options?.enabled ?? true
  if (!enabled) return undefined

  if (options?.target) {
    const target = toAbsoluteUrlFromSite(options.target, siteUrl)
    if (!target) return undefined
    return {
      "@type": "SearchAction" as const,
      target,
      "query-input": buildQueryInput(),
    }
  }

  const searchPath = options?.path ?? `${BROWSE_PATH}`
  const param = options?.param?.trim() || DEFAULT_SEARCH_PARAM
  const trimmedPath = searchPath.trim()
  const normalizedPath = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`
  const target = `${siteUrl}${normalizedPath}`

  return {
    "@type": "SearchAction" as const,
    target: `${target}?${param}={${SEARCH_PLACEHOLDER}}`,
    "query-input": buildQueryInput(),
  }
}

export function buildWebSiteStructuredData(
  options: BuildWebSiteStructuredDataOptions = {},
): WebSiteStructuredData {
  const siteUrl = resolveSiteUrl()
  const rawUrl = options.url?.trim() || siteUrl
  const url = toAbsoluteUrlFromSite(rawUrl, siteUrl) ?? siteUrl

  const id = options.id?.trim() || `${url}#website`

  const name =
    options.name?.trim() || siteConfig.name || siteConfig.tagline || "Website"

  const description = options.description?.trim() || siteConfig.description
  const keywordList = options.keywords?.length
    ? options.keywords
    : siteConfig.keywords
  const keywords = keywordList
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .join(", ")

  const potentialAction = buildSearchAction(siteUrl, options.search)

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": id,
    url,
    name,
    description,
    keywords: keywords || undefined,
    potentialAction,
  }
}

export const defaultWebSiteStructuredData = buildWebSiteStructuredData()
