import { SHIPYARD_TWITTER_URL } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

const DEFAULT_LOGO_PATH = "/brand.png" as const

export type OrganizationStructuredData = {
  "@context": "https://schema.org"
  "@type": "Organization"
  "@id": string
  name: string
  url: string
  logo: string
  sameAs: string[]
}

export function buildOrganizationStructuredData(): OrganizationStructuredData {
  const siteUrl = resolveSiteUrl()
  const logoSource = siteConfig.logo ?? DEFAULT_LOGO_PATH
  const fallbackLogo =
    toAbsoluteUrlFromSite(DEFAULT_LOGO_PATH, siteUrl) ?? `${siteUrl}/brand.png`
  const logo = toAbsoluteUrlFromSite(logoSource, siteUrl) ?? fallbackLogo

  const sameAs = Array.from(
    new Set(
      [SHIPYARD_TWITTER_URL]
        .map((entry) => entry?.trim())
        .filter((entry): entry is string => Boolean(entry?.length)),
    ),
  )

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: siteConfig.name,
    url: siteUrl,
    logo,
    sameAs,
  }
}

export const organizationStructuredData = buildOrganizationStructuredData()
