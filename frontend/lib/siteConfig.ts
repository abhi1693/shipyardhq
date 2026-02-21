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
const SUPPORT_EMAIL = "support@shipyardhq.dev"

export const resolveSiteUrl = () => SITE_URL

export const siteConfig = {
  name: "ShipYard HQ",
  tagline: "The Product Hunt alternative where builders ship together.",
  description:
    "ShipYardHQ is the Product Hunt alternative for indie hackers and micro-SaaS teams to ship in public, share progress, and rally their first customers through ongoing launches.",
  url: SITE_URL,
  ogImage: "/opengraph.png",
  logo: "/brand.png",
  icon: "/favicon.ico",
  supportEmail: SUPPORT_EMAIL,
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
    openGraph: {
      title: defaultTitle,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: absoluteOgImageUrl,
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
