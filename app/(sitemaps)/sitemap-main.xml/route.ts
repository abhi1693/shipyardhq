import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  BROWSE_PATH,
  CATEGORIES_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  LEADERBOARD_REWARDS_PATH,
  PRICING_PATH,
  pricingModelPath,
  categoryPath,
  categoryPlatformPath,
  categoryPricingPath,
  platformPath,
  productTypePath,
  usecasePath,
  ANALYTICS_PATH,
  REWARDS_PATH,
  TAGS_PATH,
  TRENDS_PATH,
  WHY_SHIPYARD_PATH,
} from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { getPublicUseCasesWithCounts } from "@/actions/public/use-cases/actions"
import {
  PLATFORM_SLUGS,
  platformValueFromSlug,
  type PlatformSlug,
} from "@/lib/platforms/config"
import {
  getPricingModelMeta,
  PRICING_MODEL_SLUGS,
  type PricingModelSlug,
} from "@/lib/pricing/models"
import {
  getProductTypeMeta,
  PRODUCT_TYPE_SLUGS,
  type ProductTypeSlug,
} from "@/lib/product-types/models"

type CategorySitemapEntry = Prisma.CategoryGetPayload<{
  select: { id: true; slug: true; updatedAt: true }
}>

export const dynamic = "force-dynamic"
export const revalidate = 86400

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

export async function GET() {
  const base = resolveSiteUrl()
  const now = new Date()

  const staticPaths = [
    "/",
    BROWSE_PATH,
    LEADERBOARD_PATH,
    PRICING_PATH,
    CATEGORIES_PATH,
    "/alternatives",
    "/legal/terms",
    "/legal/privacy-policy",
    ANALYTICS_PATH,
    TAGS_PATH,
    REWARDS_PATH,
    TRENDS_PATH,
    WHY_SHIPYARD_PATH,
    LEADERBOARD_GUIDE_PATH,
    LEADERBOARD_REWARDS_PATH,
  ] as const

  const [
    categories,
    useCases,
    platformSlices,
    pricingModelSlices,
    productTypeSlices,
  ] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    getPublicUseCasesWithCounts(),
    Promise.all(
      PLATFORM_SLUGS.map(async (slug) => {
        const latest = await prisma.product.findFirst({
          where: {
            status: "published" as any,
            platforms: { has: platformValueFromSlug(slug) },
          },
          select: { updatedAt: true, publishedAt: true },
          orderBy: { updatedAt: "desc" },
        })

        if (!latest) return null
        return {
          slug,
          lastmod: new Date(latest.updatedAt || latest.publishedAt || now),
        }
      }),
    ),
    Promise.all(
      PRICING_MODEL_SLUGS.map(async (slug) => {
        const meta = getPricingModelMeta(slug)
        if (!meta) return null

        const latest = await prisma.product.findFirst({
          where: {
            status: "published" as any,
            pricingModel: meta.value,
          },
          select: { updatedAt: true, publishedAt: true },
          orderBy: { updatedAt: "desc" },
        })

        if (!latest) return null

        return {
          slug,
          lastmod: new Date(latest.updatedAt || latest.publishedAt || now),
        }
      }),
    ),
    Promise.all(
      PRODUCT_TYPE_SLUGS.map(async (slug) => {
        const meta = getProductTypeMeta(slug)
        if (!meta) return null

        const latest = await prisma.product.findFirst({
          where: {
            status: "published" as any,
            type: meta.value,
          },
          select: { updatedAt: true, publishedAt: true },
          orderBy: { updatedAt: "desc" },
        })

        if (!latest) return null

        return {
          slug,
          lastmod: new Date(latest.updatedAt || latest.publishedAt || now),
        }
      }),
    ),
  ])
  type ProductTypeSlice = {
    slug: ProductTypeSlug
    lastmod: Date
  }

  type CategorySummary = (typeof categories)[number]
  const categoryPlatformSlices = (
    await Promise.all(
      categories.map(async (category: CategorySummary) => {
        const perPlatform = await Promise.all(
          PLATFORM_SLUGS.map(async (platformSlug) => {
            const platformValue = platformValueFromSlug(platformSlug)
            const latest = await prisma.product.findFirst({
              where: {
                status: "published" as any,
                categoryId: category.id,
                platforms: { has: platformValue },
              },
              select: { updatedAt: true, publishedAt: true },
              orderBy: { updatedAt: "desc" },
            })
            if (!latest) return null
            return {
              categorySlug: category.slug,
              platform: platformSlug,
              lastmod: new Date(latest.updatedAt || latest.publishedAt || now),
            }
          }),
        )
        return perPlatform.filter(
          (
            entry,
          ): entry is {
            categorySlug: string
            platform: PlatformSlug
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type CategoryPlatformSlice = {
    categorySlug: string
    platform: PlatformSlug
    lastmod: Date
  }

  const categoryPricingSlices = (
    await Promise.all(
      categories.map(async (category: CategorySummary) => {
        const perPricing = await Promise.all(
          PRICING_MODEL_SLUGS.map(async (pricingModel) => {
            const meta = getPricingModelMeta(pricingModel)
            if (!meta) return null
            const latest = await prisma.product.findFirst({
              where: {
                status: "published" as any,
                categoryId: category.id,
                pricingModel: meta.value,
              },
              select: { updatedAt: true, publishedAt: true },
              orderBy: { updatedAt: "desc" },
            })
            if (!latest) return null
            return {
              categorySlug: category.slug,
              pricingModel,
              lastmod: new Date(latest.updatedAt || latest.publishedAt || now),
            }
          }),
        )
        return perPricing.filter(
          (
            entry,
          ): entry is {
            categorySlug: string
            pricingModel: PricingModelSlug
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type CategoryPricingSlice = {
    categorySlug: string
    pricingModel: PricingModelSlug
    lastmod: Date
  }

  const urls = [
    ...staticPaths.map((path) => {
      let changefreq = "weekly"
      let priority = "0.7"
      switch (path) {
        case "/":
          changefreq = "daily"
          priority = "1.0"
          break
        case BROWSE_PATH:
          changefreq = "daily"
          priority = "0.9"
          break
        case LEADERBOARD_PATH:
          changefreq = "daily"
          priority = "0.8"
          break
        case PRICING_PATH:
          changefreq = "monthly"
          priority = "0.6"
          break
        case CATEGORIES_PATH:
          changefreq = "weekly"
          priority = "0.7"
          break
        case "/alternatives":
          changefreq = "weekly"
          priority = "0.65"
          break
        case "/legal/terms":
        case "/legal/privacy-policy":
          changefreq = "yearly"
          priority = "0.3"
          break
        case TAGS_PATH:
          changefreq = "weekly"
          priority = "0.6"
          break
        case ANALYTICS_PATH:
          changefreq = "weekly"
          priority = "0.5"
          break
        case REWARDS_PATH:
          changefreq = "weekly"
          priority = "0.55"
          break
        case TRENDS_PATH:
          changefreq = "daily"
          priority = "0.65"
          break
        case WHY_SHIPYARD_PATH:
          changefreq = "monthly"
          priority = "0.45"
          break
        case LEADERBOARD_GUIDE_PATH:
          changefreq = "yearly"
          priority = "0.35"
          break
        case LEADERBOARD_REWARDS_PATH:
          changefreq = "weekly"
          priority = "0.55"
          break
      }
      return xml`
        <url>
          <loc>${base}${path}</loc>
          <lastmod>${now.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...platformSlices
      .filter(
        (
          entry: { slug: PlatformSlug; lastmod: Date } | null,
        ): entry is { slug: PlatformSlug; lastmod: Date } => entry !== null,
      )
      .map((entry: { slug: PlatformSlug; lastmod: Date }) => {
        const days = Math.floor(
          (now.getTime() - entry.lastmod.getTime()) / 86400000,
        )
        const changefreq =
          days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
        const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.45"
        return xml`
          <url>
            <loc>${base}${platformPath(entry.slug)}</loc>
            <lastmod>${entry.lastmod.toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
      }),
    ...pricingModelSlices
      .filter(
        (
          entry: { slug: PricingModelSlug; lastmod: Date } | null,
        ): entry is { slug: PricingModelSlug; lastmod: Date } => entry !== null,
      )
      .map((entry: { slug: PricingModelSlug; lastmod: Date }) => {
        const days = Math.floor(
          (now.getTime() - entry.lastmod.getTime()) / 86400000,
        )
        const changefreq =
          days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
        const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.45"
        return xml`
          <url>
            <loc>${base}${pricingModelPath(entry.slug)}</loc>
            <lastmod>${entry.lastmod.toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
      }),
    ...categoryPlatformSlices.map((entry: CategoryPlatformSlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.45"
      return xml`
        <url>
          <loc>${base}${categoryPlatformPath(entry.categorySlug, entry.platform)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...categoryPricingSlices.map((entry: CategoryPricingSlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.45"
      return xml`
        <url>
          <loc>${base}${categoryPricingPath(entry.categorySlug, entry.pricingModel)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...productTypeSlices
      .filter(
        (entry: ProductTypeSlice | null): entry is ProductTypeSlice =>
          entry !== null,
      )
      .map((entry: ProductTypeSlice) => {
        const days = Math.floor(
          (now.getTime() - entry.lastmod.getTime()) / 86400000,
        )
        const changefreq =
          days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
        const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.45"
        return xml`
          <url>
            <loc>${base}${productTypePath(entry.slug)}</loc>
            <lastmod>${entry.lastmod.toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
      }),
    ...categories.map((c: CategorySitemapEntry) => {
      const last = c.updatedAt || now
      const days = Math.floor(
        (now.getTime() - new Date(last).getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.7" : days <= 60 ? "0.6" : "0.5"
      return xml`
          <url>
            <loc>${base}${categoryPath(c.slug)}</loc>
            <lastmod>${new Date(last).toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
    }),
    ...useCases
      .filter((useCase: (typeof useCases)[number]) => useCase.productCount > 0)
      .map((useCase: (typeof useCases)[number]) => {
        const last = useCase.updatedAt || now
        const days = Math.floor(
          (now.getTime() - new Date(last).getTime()) / 86400000,
        )
        const changefreq =
          days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
        const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.4"
        return xml`
          <url>
            <loc>${base}${usecasePath(useCase.slug)}</loc>
            <lastmod>${new Date(last).toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
      }),
  ].join("")

  const body = xml`
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
