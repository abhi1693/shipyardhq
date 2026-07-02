import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  BROWSE_PATH,
  CATEGORIES_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  PRICING_PATH,
  pricingModelPath,
  USE_CASES_PATH,
  categoryPath,
  categoryPlatformPath,
  categoryProductTypePath,
  categoryPricingPath,
  editorPickCategoryPath,
  platformPath,
  productTypePath,
  usecaseCategoryPath,
  usecasePlatformPath,
  usecasePricingPath,
  usecasePath,
  verifiedCategoryPath,
  alternativeCategoryPath,
  ANALYTICS_PATH,
  ALTERNATIVES_PATH,
  PLATFORMS_PATH,
  PRODUCT_TYPES_PATH,
  TAGS_PATH,
  USERS_PATH,
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
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { PSEO_MIN_INDEXABLE_PRODUCTS } from "@/lib/pseo/product-slices"
import { sitemapResponse } from "@/lib/sitemap"

type CategorySitemapEntry = Prisma.CategoryGetPayload<{
  select: { id: true; slug: true; updatedAt: true }
}>

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
    USE_CASES_PATH,
    ALTERNATIVES_PATH,
    PLATFORMS_PATH,
    PRODUCT_TYPES_PATH,
    USERS_PATH,
    "/legal/terms",
    "/legal/privacy-policy",
    ANALYTICS_PATH,
    TAGS_PATH,
    WHY_SHIPYARD_PATH,
    LEADERBOARD_GUIDE_PATH,
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
          where: buildPublicDiscoveryProductWhere({
            platforms: { has: platformValueFromSlug(slug) },
          }),
          select: { updatedAt: true, publishedAt: true },
          orderBy: { updatedAt: "desc" },
        })

        if (!latest) return null
        return {
          slug,
          lastmod: new Date(latest.updatedAt || latest.publishedAt),
        }
      }),
    ),
    Promise.all(
      PRICING_MODEL_SLUGS.map(async (slug) => {
        const meta = getPricingModelMeta(slug)
        if (!meta) return null

        const latest = await prisma.product.findFirst({
          where: buildPublicDiscoveryProductWhere({
            pricingModel: meta.value,
          }),
          select: { updatedAt: true, publishedAt: true },
          orderBy: { updatedAt: "desc" },
        })

        if (!latest) return null

        return {
          slug,
          lastmod: new Date(latest.updatedAt || latest.publishedAt),
        }
      }),
    ),
    Promise.all(
      PRODUCT_TYPE_SLUGS.map(async (slug) => {
        const meta = getProductTypeMeta(slug)
        if (!meta) return null

        const latest = await prisma.product.findFirst({
          where: buildPublicDiscoveryProductWhere({
            type: meta.value,
          }),
          select: { updatedAt: true, publishedAt: true },
          orderBy: { updatedAt: "desc" },
        })

        if (!latest) return null

        return {
          slug,
          lastmod: new Date(latest.updatedAt || latest.publishedAt),
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
            const where = buildPublicDiscoveryProductWhere({
              categoryId: category.id,
              platforms: { has: platformValue },
            })
            const latest = await prisma.product.findFirst({
              where,
              select: { updatedAt: true, publishedAt: true },
              orderBy: { updatedAt: "desc" },
            })
            const count = latest ? await prisma.product.count({ where }) : 0
            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              categorySlug: category.slug,
              platform: platformSlug,
              lastmod: new Date(latest.updatedAt || latest.publishedAt),
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
            const where = buildPublicDiscoveryProductWhere({
              categoryId: category.id,
              pricingModel: meta.value,
            })
            const latest = await prisma.product.findFirst({
              where,
              select: { updatedAt: true, publishedAt: true },
              orderBy: { updatedAt: "desc" },
            })
            const count = latest ? await prisma.product.count({ where }) : 0
            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              categorySlug: category.slug,
              pricingModel,
              lastmod: new Date(latest.updatedAt || latest.publishedAt),
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

  const categoryProductTypeSlices = (
    await Promise.all(
      categories.map(async (category: CategorySummary) => {
        const perType = await Promise.all(
          PRODUCT_TYPE_SLUGS.map(async (productType) => {
            const meta = getProductTypeMeta(productType)
            if (!meta) return null

            const where = buildPublicDiscoveryProductWhere({
              categoryId: category.id,
              type: meta.value,
            })
            const [count, latest] = await Promise.all([
              prisma.product.count({ where }),
              prisma.product.findFirst({
                where,
                select: { updatedAt: true, publishedAt: true },
                orderBy: { updatedAt: "desc" },
              }),
            ])

            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              categorySlug: category.slug,
              productType,
              lastmod: new Date(latest.updatedAt || latest.publishedAt),
            }
          }),
        )
        return perType.filter(
          (
            entry,
          ): entry is {
            categorySlug: string
            productType: ProductTypeSlug
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type CategoryProductTypeSlice = {
    categorySlug: string
    productType: ProductTypeSlug
    lastmod: Date
  }

  const useCasesWithCategories = await prisma.useCase.findMany({
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      categories: {
        select: {
          category: {
            select: {
              id: true,
              slug: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  })

  const buildUseCaseProductWhere = (
    categoryIds: string[],
    extra: Parameters<typeof buildPublicDiscoveryProductWhere>[0] = {},
  ) =>
    buildPublicDiscoveryProductWhere({
      ...extra,
      OR: [
        { categoryId: { in: categoryIds } },
        { categories: { some: { categoryId: { in: categoryIds } } } },
      ],
    })

  const useCaseCategorySlices = (
    await Promise.all(
      useCasesWithCategories.map(async (useCase) => {
        const perCategory = await Promise.all(
          useCase.categories.map(async ({ category }) => {
            const where = buildPublicDiscoveryProductWhere({
              OR: [
                { categoryId: category.id },
                { categories: { some: { categoryId: category.id } } },
              ],
            })
            const [count, latest] = await Promise.all([
              prisma.product.count({ where }),
              prisma.product.findFirst({
                where,
                select: { updatedAt: true, publishedAt: true },
                orderBy: { updatedAt: "desc" },
              }),
            ])

            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              useCaseSlug: useCase.slug,
              categorySlug: category.slug,
              lastmod: new Date(
                latest.updatedAt || latest.publishedAt || category.updatedAt,
              ),
            }
          }),
        )
        return perCategory.filter(
          (
            entry,
          ): entry is {
            useCaseSlug: string
            categorySlug: string
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type UseCaseCategorySlice = {
    useCaseSlug: string
    categorySlug: string
    lastmod: Date
  }

  const useCasePricingSlices = (
    await Promise.all(
      useCasesWithCategories.map(async (useCase) => {
        const categoryIds = useCase.categories.map(
          ({ category }) => category.id,
        )
        if (!categoryIds.length) return []

        const perPricing = await Promise.all(
          PRICING_MODEL_SLUGS.map(async (pricingModel) => {
            const meta = getPricingModelMeta(pricingModel)
            if (!meta) return null
            const where = buildUseCaseProductWhere(categoryIds, {
              pricingModel: meta.value,
            })
            const [count, latest] = await Promise.all([
              prisma.product.count({ where }),
              prisma.product.findFirst({
                where,
                select: { updatedAt: true, publishedAt: true },
                orderBy: { updatedAt: "desc" },
              }),
            ])

            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              useCaseSlug: useCase.slug,
              pricingModel,
              lastmod: new Date(
                latest.updatedAt || latest.publishedAt || useCase.updatedAt,
              ),
            }
          }),
        )
        return perPricing.filter(
          (
            entry,
          ): entry is {
            useCaseSlug: string
            pricingModel: PricingModelSlug
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type UseCasePricingSlice = {
    useCaseSlug: string
    pricingModel: PricingModelSlug
    lastmod: Date
  }

  const useCasePlatformSlices = (
    await Promise.all(
      useCasesWithCategories.map(async (useCase) => {
        const categoryIds = useCase.categories.map(
          ({ category }) => category.id,
        )
        if (!categoryIds.length) return []

        const perPlatform = await Promise.all(
          PLATFORM_SLUGS.map(async (platformSlug) => {
            const where = buildUseCaseProductWhere(categoryIds, {
              platforms: { has: platformValueFromSlug(platformSlug) },
            })
            const [count, latest] = await Promise.all([
              prisma.product.count({ where }),
              prisma.product.findFirst({
                where,
                select: { updatedAt: true, publishedAt: true },
                orderBy: { updatedAt: "desc" },
              }),
            ])

            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              useCaseSlug: useCase.slug,
              platform: platformSlug,
              lastmod: new Date(
                latest.updatedAt || latest.publishedAt || useCase.updatedAt,
              ),
            }
          }),
        )
        return perPlatform.filter(
          (
            entry,
          ): entry is {
            useCaseSlug: string
            platform: PlatformSlug
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type UseCasePlatformSlice = {
    useCaseSlug: string
    platform: PlatformSlug
    lastmod: Date
  }

  const alternativeCategorySlices = (
    await Promise.all(
      (
        await prisma.alternativeProduct.findMany({
          where: { products: { some: buildPublicDiscoveryProductWhere() } },
          select: {
            id: true,
            slug: true,
            updatedAt: true,
            categories: {
              select: { id: true, slug: true, updatedAt: true },
            },
          },
        })
      ).map(async (alternative) => {
        const perCategory = await Promise.all(
          alternative.categories.map(async (category) => {
            const where = buildPublicDiscoveryProductWhere({
              alternatives: { some: { id: alternative.id } },
              OR: [
                { categoryId: category.id },
                { categories: { some: { categoryId: category.id } } },
              ],
            })
            const [count, latest] = await Promise.all([
              prisma.product.count({ where }),
              prisma.product.findFirst({
                where,
                select: { updatedAt: true, publishedAt: true },
                orderBy: { updatedAt: "desc" },
              }),
            ])
            if (!latest || count < PSEO_MIN_INDEXABLE_PRODUCTS) return null
            return {
              alternativeSlug: alternative.slug,
              categorySlug: category.slug,
              lastmod: new Date(
                latest.updatedAt ||
                  latest.publishedAt ||
                  alternative.updatedAt ||
                  category.updatedAt,
              ),
            }
          }),
        )
        return perCategory.filter(
          (
            entry,
          ): entry is {
            alternativeSlug: string
            categorySlug: string
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type AlternativeCategorySlice = {
    alternativeSlug: string
    categorySlug: string
    lastmod: Date
  }

  const curatedCategorySlices = (
    await Promise.all(
      categories.map(async (category: CategorySummary) => {
        const categoryWhere = {
          OR: [
            { categoryId: category.id },
            { categories: { some: { categoryId: category.id } } },
          ],
        }
        const verifiedWhere = buildPublicDiscoveryProductWhere({
          ...categoryWhere,
          verification: { is: { isVerified: true } },
        })
        const editorPickWhere = buildPublicDiscoveryProductWhere({
          ...categoryWhere,
          ProductBadge: {
            some: {
              badge: "editor-pick",
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        })
        const [
          verifiedCount,
          verifiedLatest,
          editorPickCount,
          editorPickLatest,
        ] = await Promise.all([
          prisma.product.count({ where: verifiedWhere }),
          prisma.product.findFirst({
            where: verifiedWhere,
            select: { updatedAt: true, publishedAt: true },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.product.count({ where: editorPickWhere }),
          prisma.product.findFirst({
            where: editorPickWhere,
            select: { updatedAt: true, publishedAt: true },
            orderBy: { updatedAt: "desc" },
          }),
        ])

        return [
          verifiedLatest && verifiedCount >= PSEO_MIN_INDEXABLE_PRODUCTS
            ? {
                type: "verified" as const,
                categorySlug: category.slug,
                lastmod: new Date(
                  verifiedLatest.updatedAt ||
                    verifiedLatest.publishedAt ||
                    category.updatedAt,
                ),
              }
            : null,
          editorPickLatest && editorPickCount >= PSEO_MIN_INDEXABLE_PRODUCTS
            ? {
                type: "editor-pick" as const,
                categorySlug: category.slug,
                lastmod: new Date(
                  editorPickLatest.updatedAt ||
                    editorPickLatest.publishedAt ||
                    category.updatedAt,
                ),
              }
            : null,
        ].filter(
          (
            entry,
          ): entry is {
            type: "verified" | "editor-pick"
            categorySlug: string
            lastmod: Date
          } => Boolean(entry),
        )
      }),
    )
  ).flat()
  type CuratedCategorySlice = {
    type: "verified" | "editor-pick"
    categorySlug: string
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
        case USE_CASES_PATH:
          changefreq = "weekly"
          priority = "0.65"
          break
        case ALTERNATIVES_PATH:
          changefreq = "weekly"
          priority = "0.65"
          break
        case PLATFORMS_PATH:
        case PRODUCT_TYPES_PATH:
        case USERS_PATH:
          changefreq = "weekly"
          priority = "0.6"
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
        case WHY_SHIPYARD_PATH:
          changefreq = "monthly"
          priority = "0.45"
          break
        case LEADERBOARD_GUIDE_PATH:
          changefreq = "yearly"
          priority = "0.35"
          break
      }
      return xml`
        <url>
          <loc>${base}${path}</loc>
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
    ...categoryProductTypeSlices.map((entry: CategoryProductTypeSlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.45"
      return xml`
        <url>
          <loc>${base}${categoryProductTypePath(entry.categorySlug, entry.productType)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...useCaseCategorySlices.map((entry: UseCaseCategorySlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.55" : days <= 60 ? "0.5" : "0.4"
      return xml`
        <url>
          <loc>${base}${usecaseCategoryPath(entry.useCaseSlug, entry.categorySlug)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...useCasePricingSlices.map((entry: UseCasePricingSlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.55" : days <= 60 ? "0.5" : "0.4"
      return xml`
        <url>
          <loc>${base}${usecasePricingPath(entry.useCaseSlug, entry.pricingModel)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...useCasePlatformSlices.map((entry: UseCasePlatformSlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.55" : days <= 60 ? "0.5" : "0.4"
      return xml`
        <url>
          <loc>${base}${usecasePlatformPath(entry.useCaseSlug, entry.platform)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...alternativeCategorySlices.map((entry: AlternativeCategorySlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.55" : days <= 60 ? "0.5" : "0.4"
      return xml`
        <url>
          <loc>${base}${alternativeCategoryPath(entry.alternativeSlug, entry.categorySlug)}</loc>
          <lastmod>${entry.lastmod.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...curatedCategorySlices.map((entry: CuratedCategorySlice) => {
      const days = Math.floor(
        (now.getTime() - entry.lastmod.getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.55" : days <= 60 ? "0.5" : "0.4"
      const path =
        entry.type === "verified"
          ? verifiedCategoryPath(entry.categorySlug)
          : editorPickCategoryPath(entry.categorySlug)
      return xml`
        <url>
          <loc>${base}${path}</loc>
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
    ...categories.flatMap((c: CategorySitemapEntry) => {
      const last = c.updatedAt
      const days = Math.floor(
        (now.getTime() - new Date(last).getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.7" : days <= 60 ? "0.6" : "0.5"
      return [
        xml`
          <url>
            <loc>${base}${categoryPath(c.slug)}</loc>
            <lastmod>${new Date(last).toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `,
        xml`
          <url>
            <loc>${base}/trends/categories/${c.slug}</loc>
            <lastmod>${new Date(last).toISOString()}</lastmod>
            <changefreq>daily</changefreq>
            <priority>0.55</priority>
          </url>
        `,
      ]
    }),
    ...useCases
      .filter((useCase: (typeof useCases)[number]) => useCase.productCount > 0)
      .map((useCase: (typeof useCases)[number]) => {
        const last = useCase.updatedAt
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

  return sitemapResponse(body)
}
