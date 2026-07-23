import { GUIDE_SLUGS } from "@/lib/guides/catalog"
import {
  ALTERNATIVES_PATH,
  ANALYTICS_PATH,
  ABOUT_PATH,
  BROWSE_PATH,
  CATEGORIES_PATH,
  EDITORIAL_POLICY_PATH,
  GUIDES_PATH,
  LEADERBOARD_GUIDE_PATH,
  LEADERBOARD_PATH,
  PLATFORMS_PATH,
  PRICING_PATH,
  PRODUCT_TYPES_PATH,
  TAGS_PATH,
  USE_CASES_PATH,
  WHY_SHIPYARD_PATH,
  categoryPath,
  guidePath,
  platformPath,
  pricingModelPath,
  productTypePath,
  usecasePath,
} from "@/lib/routes"
import { PLATFORM_SLUGS } from "@/lib/platforms/config"
import { PRICING_MODEL_SLUGS } from "@/lib/pricing/models"
import { PRODUCT_TYPE_SLUGS } from "@/lib/product-types/models"
import { PSEO_MIN_INDEXABLE_PRODUCTS } from "@/lib/pseo/product-slices"
import { getMainSitemapData } from "@/lib/server/sitemap-data"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  sitemapChangefreqForAge,
  sitemapResponse,
  urlsetXml,
  type SitemapUrlEntry,
} from "@/lib/sitemap"

const STATIC_ENTRIES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: BROWSE_PATH, changefreq: "daily", priority: "0.9" },
  { path: LEADERBOARD_PATH, changefreq: "daily", priority: "0.8" },
  { path: CATEGORIES_PATH, changefreq: "weekly", priority: "0.7" },
  { path: USE_CASES_PATH, changefreq: "weekly", priority: "0.65" },
  { path: ALTERNATIVES_PATH, changefreq: "weekly", priority: "0.65" },
  { path: PLATFORMS_PATH, changefreq: "weekly", priority: "0.6" },
  { path: PRODUCT_TYPES_PATH, changefreq: "weekly", priority: "0.6" },
  { path: TAGS_PATH, changefreq: "weekly", priority: "0.6" },
  { path: GUIDES_PATH, changefreq: "monthly", priority: "0.7" },
  { path: PRICING_PATH, changefreq: "monthly", priority: "0.6" },
  { path: ANALYTICS_PATH, changefreq: "weekly", priority: "0.5" },
  { path: WHY_SHIPYARD_PATH, changefreq: "monthly", priority: "0.55" },
  { path: ABOUT_PATH, changefreq: "yearly", priority: "0.4" },
  { path: EDITORIAL_POLICY_PATH, changefreq: "yearly", priority: "0.4" },
  { path: LEADERBOARD_GUIDE_PATH, changefreq: "yearly", priority: "0.35" },
  { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/legal/privacy-policy", changefreq: "yearly", priority: "0.3" },
] as const satisfies ReadonlyArray<{
  path: string
  changefreq: SitemapUrlEntry["changefreq"]
  priority: string
}>

function daysSince(value: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / 86_400_000))
}

export async function GET() {
  const base = resolveSiteUrl()
  const now = new Date()

  const { categories, useCases } = await getMainSitemapData()

  const entries: SitemapUrlEntry[] = [
    ...STATIC_ENTRIES.map(({ path, changefreq, priority }) => ({
      loc: `${base}${path}`,
      changefreq,
      priority,
    })),
    ...GUIDE_SLUGS.map((slug) => ({
      loc: `${base}${guidePath(slug)}`,
      changefreq: "monthly" as const,
      priority: "0.65",
    })),
    ...PLATFORM_SLUGS.map((slug) => ({
      loc: `${base}${platformPath(slug)}`,
      changefreq: "weekly" as const,
      priority: "0.55",
    })),
    ...PRICING_MODEL_SLUGS.map((slug) => ({
      loc: `${base}${pricingModelPath(slug)}`,
      changefreq: "weekly" as const,
      priority: "0.55",
    })),
    ...PRODUCT_TYPE_SLUGS.map((slug) => ({
      loc: `${base}${productTypePath(slug)}`,
      changefreq: "weekly" as const,
      priority: "0.55",
    })),
    ...categories
      .filter(
        (category) =>
          category._count.productAssignments >= PSEO_MIN_INDEXABLE_PRODUCTS,
      )
      .flatMap((category): SitemapUrlEntry[] => {
        const age = daysSince(category.updatedAt, now)
        return [
          {
            loc: `${base}${categoryPath(category.slug)}`,
            lastmod: category.updatedAt,
            changefreq: sitemapChangefreqForAge(age),
            priority: age <= 60 ? "0.65" : "0.55",
          },
          {
            loc: `${base}/trends/categories/${category.slug}`,
            lastmod: category.updatedAt,
            changefreq: "daily",
            priority: "0.5",
          },
        ]
      }),
    ...useCases
      .filter((useCase) => useCase.productCount >= PSEO_MIN_INDEXABLE_PRODUCTS)
      .map((useCase): SitemapUrlEntry => {
        const updatedAt = new Date(useCase.updatedAt)
        const age = daysSince(updatedAt, now)
        return {
          loc: `${base}${usecasePath(useCase.slug)}`,
          lastmod: updatedAt,
          changefreq: sitemapChangefreqForAge(age),
          priority: age <= 60 ? "0.6" : "0.5",
        }
      }),
  ]

  return sitemapResponse(urlsetXml(entries))
}
