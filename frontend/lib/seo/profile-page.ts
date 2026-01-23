import { siteConfig } from "@/lib/siteConfig"
import { HOME_PATH, USERS_PATH, productPath, userPath } from "@/lib/routes"
import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"
import { buildBreadcrumbListStructuredData } from "@/lib/seo/breadcrumbs"

type PersonStructuredData = {
  "@context": string
  "@type": "Person"
  "@id": string
  name: string
  identifier?: string
  url: string
  image?: string
}

type ProfileProductList = {
  "@context": string
  "@type": "ItemList"
  itemListElement: Array<{
    "@type": "ListItem"
    position: number
    item: string
  }>
}

export type ProfileProductInput = {
  /** Product slug used to derive the canonical path. */
  slug?: string
  /** Absolute URL for the product. */
  url?: string
  /** Convenience path relative to the site root (e.g., `/products/slug`). */
  path?: string
}

export type ProfileBreadcrumbInput = {
  name: string
  url?: string
  path?: string
}

export type BuildProfilePageStructuredDataOptions = {
  profileId: string
  fullName: string
  /** Absolute profile URL. */
  profileUrl?: string
  /** Convenience path relative to the site root. */
  profilePath?: string
  avatarUrl?: string | null
  products?: ProfileProductInput[]
  breadcrumbs?: ProfileBreadcrumbInput[]
}

export type ProfilePageStructuredData = {
  person: PersonStructuredData
  products?: ProfileProductList
  breadcrumbs: ReturnType<typeof buildBreadcrumbListStructuredData>
}

const normalizePath = (value?: string | null) => {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

const toAbsoluteProfileUrl = (
  siteUrl: string,
  profileUrl?: string,
  profilePath?: string,
) => {
  if (profileUrl) {
    const resolved = toAbsoluteUrlFromSite(profileUrl, siteUrl)
    if (resolved) return resolved
  }
  const normalizedPath = normalizePath(profilePath)
  return normalizedPath ? `${siteUrl}${normalizedPath}` : siteUrl
}

const buildDefaultBreadcrumbs = (
  profileName: string,
  profileUrl: string,
): ProfileBreadcrumbInput[] => [
  { name: "Home", path: HOME_PATH },
  { name: "Makers", path: USERS_PATH },
  { name: profileName, url: profileUrl },
]

const buildProductList = (
  siteUrl: string,
  products?: ProfileProductInput[],
): ProfileProductList | undefined => {
  if (!products?.length) return undefined
  const normalized = products
    .map((product) => {
      if (product.slug) {
        return `${siteUrl}${productPath(product.slug)}`
      }
      if (product.url) {
        const absolute = toAbsoluteUrlFromSite(product.url, siteUrl)
        if (absolute) return absolute
      }
      if (product.path) {
        const normalizedPath = normalizePath(product.path)
        if (normalizedPath) return `${siteUrl}${normalizedPath}`
      }
      return null
    })
    .filter((value): value is string => Boolean(value?.length))

  if (!normalized.length) return undefined

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: normalized.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item,
    })),
  }
}

export function buildProfilePageJsonLd(
  options: BuildProfilePageStructuredDataOptions,
): ProfilePageStructuredData {
  const siteUrl = resolveSiteUrl()
  const profileUrl = toAbsoluteProfileUrl(
    siteUrl,
    options.profileUrl,
    options.profilePath ?? userPath(options.profileId),
  )

  const image = options.avatarUrl
    ? toAbsoluteUrlFromSite(options.avatarUrl, siteUrl)
    : undefined

  const person: PersonStructuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${profileUrl}#person`,
    name: options.fullName,
    identifier: options.profileId,
    url: profileUrl,
    ...(image ? { image } : {}),
  }

  const products = buildProductList(siteUrl, options.products)

  const breadcrumbInputs = options.breadcrumbs?.length
    ? options.breadcrumbs
    : buildDefaultBreadcrumbs(options.fullName, profileUrl)

  const breadcrumbs = buildBreadcrumbListStructuredData(breadcrumbInputs, {
    pageUrl: profileUrl,
  })

  return {
    person,
    products,
    breadcrumbs,
  }
}

export const emptyProfilePageStructuredData = buildProfilePageJsonLd({
  profileId: "unknown",
  fullName: siteConfig.name,
  profileUrl: resolveSiteUrl(),
  products: [],
})
