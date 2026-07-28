import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type BreadcrumbInput = {
  name: string
  /**
   * Absolute or relative URL for the breadcrumb item.
   */
  url?: string
  /**
   * Convenience path relative to the site root (ignored when `url` is provided).
   */
  path?: string
}

export type BreadcrumbListStructuredData = {
  "@context"?: string
  "@type": "BreadcrumbList"
  "@id"?: string
  itemListElement: Array<{
    "@type": "ListItem"
    position: number
    name: string
    item: {
      "@type": string
      "@id": string
      name: string
    }
  }>
}

export type BuildBreadcrumbListStructuredDataOptions = {
  /**
   * Optional canonical page URL used to derive the `@id` when `id` is not provided.
   */
  pageUrl?: string
  /**
   * Override the BreadcrumbList `@id`.
   */
  id?: string
  /**
   * Schema.org type for each breadcrumb `item`. Defaults to `Thing`.
   */
  itemType?: string
}

const normalizePath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("/")) return trimmed
  return `/${trimmed}`
}

const toAbsoluteItemUrl = (siteUrl: string, input: BreadcrumbInput) => {
  if (input.url) {
    const absolute = toAbsoluteUrlFromSite(input.url, siteUrl)
    if (absolute) return absolute
  }
  if (input.path) {
    return `${siteUrl}${normalizePath(input.path)}`
  }
  return siteUrl
}

export function buildBreadcrumbListStructuredData(
  items: BreadcrumbInput[],
  options: BuildBreadcrumbListStructuredDataOptions = {},
): BreadcrumbListStructuredData {
  const siteUrl = resolveSiteUrl()
  const itemType = options.itemType?.trim() || "Thing"

  const normalizedItems = items
    .map((item) => {
      const name = item.name?.trim()
      if (!name) return null
      const itemUrl = toAbsoluteItemUrl(siteUrl, item)
      return { name, item: itemUrl }
    })
    .filter((value): value is { name: string; item: string } => Boolean(value))

  const pageUrl = options.pageUrl
    ? toAbsoluteUrlFromSite(options.pageUrl, siteUrl)
    : normalizedItems.at(-1)?.item

  const id =
    options.id?.trim() || (pageUrl ? `${pageUrl}#breadcrumb` : undefined)

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: normalizedItems.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: {
        "@type": itemType,
        "@id": entry.item,
        name: entry.name,
      },
    })),
  }
}
