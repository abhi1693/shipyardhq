import { BRAND_NAME } from "@/lib/brand"
import { ensureUrlHasSchema } from "@/lib/utils"

const DEFAULT_SITE_URL = "http://localhost:3000" as const
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const computeSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const base = raw && raw.length > 0 ? raw : DEFAULT_SITE_URL
  const withSchema = ensureUrlHasSchema(base)
  const sanitized = stripTrailingSlash(withSchema)
  return sanitized || DEFAULT_SITE_URL
}

const SITE_URL = computeSiteUrl()
const ADMIN_EMAIL = "support@shipyardhq.dev"

export const resolveSiteUrl = () => SITE_URL

export const siteGrowthMetrics = {
  builderCount: 1600,
} as const

export const siteSeoKeywords = [
  "app directory",
  "product launch directory",
  "launch your product",
  "submit your app",
  "submit your startup",
  "startup directory",
  "SaaS directory",
  "AI tools directory",
  "product discovery",
  "Product Hunt alternative",
  "indie maker products",
  "launch marketplace",
  "software directory",
  "app launch platform",
] as const

export const siteConfig = {
  name: BRAND_NAME,
  tagline: "Product launch directory for apps, SaaS, and startups.",
  description: `${BRAND_NAME} helps founders launch apps, SaaS tools, APIs, and startup projects with focused discovery, rankings, promotion, and traction analytics.`,
  keywords: [...siteSeoKeywords],
  url: SITE_URL,
  ogImage: "/opengraph.png",
  logo: "/brand.png",
  icon: "/favicon.ico",
  adminEmail: ADMIN_EMAIL,
}

export const absoluteOgImageUrl = new URL(
  siteConfig.ogImage,
  siteConfig.url,
).toString()

export const buildSiteSeo = () => {
  const defaultTitle = siteConfig.tagline

  return {
    defaultTitle,
    titleTemplate: `%s | ${siteConfig.name}`,
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    openGraph: {
      type: "website" as const,
      locale: "en_US",
      title: defaultTitle,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: absoluteOgImageUrl,
          width: 1733,
          height: 907,
          type: "image/png",
          alt: `${siteConfig.name} brand mark`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: defaultTitle,
      description: siteConfig.description,
      images: [absoluteOgImageUrl],
    },
  }
}
