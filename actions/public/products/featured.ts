import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { stableUnitInterval } from "@/lib/stable-random"
import type { FeaturedProduct } from "@/types"
import { featuredProductSelect } from "@/types"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  buildCatalogQueryCacheKey,
  cacheCatalogQuery,
} from "@/lib/server/catalog-query-cache"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import {
  buildActivePlacementPlanFilter,
  getPartnerSpotlightPlanIds,
  getSponsoredProductsPlanIds,
} from "@/lib/products/priority-plans"

type SponsoredProduct = Prisma.ProductGetPayload<{
  select: {
    id: true
    slug: true
    name: true
    tagline: true
    logo: true
    bannerImage: true
  }
}>

export type SponsoredProductPlacement = {
  id: string
  product: SponsoredProduct
  origin: "plan"
}

async function withFeaturedProductScores<T extends { product: { id: string } }>(
  entries: T[],
) {
  const scoreMap = await getCurrentScoreMap(
    entries.map((entry: T) => entry.product.id),
  )

  return entries.map((entry: T) => ({
    ...entry,
    product: {
      ...entry.product,
      scoreCount: scoreMap.get(entry.product.id),
    },
  }))
}

export async function getProducts(
  badge: string,
  limit = 24,
): Promise<FeaturedProduct[]> {
  "use cache"
  applyCache([TAGS.products, TAGS.badges, `badge:${badge}`], DEFAULT_TTL.fast)

  const now = new Date()
  const entries = await prisma.productBadge.findMany({
    where: {
      badge,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      product: buildPublicDiscoveryProductWhere(),
    },
    take: limit,
    select: featuredProductSelect,
    orderBy: { createdAt: "asc" },
  })

  return (await withFeaturedProductScores(
    entries,
  )) as unknown as FeaturedProduct[]
}

export async function getTrendingProducts(limit = 12) {
  "use cache"
  applyCache(
    [TAGS.products, TAGS.trending, TAGS.leaderboard, TAGS.analytics],
    DEFAULT_TTL.fast,
  )

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const trending = await prisma.productBadge.findMany({
    distinct: ["productId"],
    take: limit,
    orderBy: {
      product: {
        analytics: {
          upvotes: "desc",
        },
      },
    },
    where: {
      product: buildPublicDiscoveryProductWhere({
        createdAt: { lte: new Date() },
        updatedAt: { gte: yesterday },
        analytics: {
          upvotes: {
            gt: 0,
          },
        },
      }),
    },
    select: featuredProductSelect,
  })

  return (await withFeaturedProductScores(
    trending,
  )) as unknown as Prisma.ProductBadgeGetPayload<{
    select: typeof featuredProductSelect
  }>[]
}

export async function getTopCategories(limit = 12) {
  "use cache"
  applyCache([TAGS.categories], DEFAULT_TTL.slow)

  return cacheCatalogQuery({
    key: buildCatalogQueryCacheKey("top-categories", { limit }),
    ttlSeconds: DEFAULT_TTL.slow,
    loader: async () => {
      const categories = await prisma.category.findMany({
        orderBy: {
          productAssignments: {
            _count: "desc",
          },
        },
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          _count: {
            select: {
              productAssignments: true,
            },
          },
        },
      })

      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        _count: {
          products: category._count.productAssignments,
        },
      }))
    },
  })
}

// Get featured products filtered by category slug
export async function getFeaturedByCategorySlug(
  slug: string,
  limit = 6,
): Promise<FeaturedProduct[]> {
  "use cache"
  applyCache(
    [TAGS.products, TAGS.featured, TAGS.badges, TAGS.category(String(slug))],
    DEFAULT_TTL.fast,
  )

  const now = new Date()
  const entries = await prisma.productBadge.findMany({
    where: {
      badge: "featured",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      product: buildPublicDiscoveryProductWhere({
        OR: [
          { category: { slug } },
          { categories: { some: { category: { slug } } } },
        ],
      }),
    },
    select: featuredProductSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return (await withFeaturedProductScores(
    entries,
  )) as unknown as FeaturedProduct[]
}

// Get published products whose assigned plan includes Partner Spotlight.
type PartnerSpotlightProductResult = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string | null
}

export type PartnerSpotlightProduct = PartnerSpotlightProductResult

export async function getPartnerSpotlightProducts(
  limit = 100,
): Promise<PartnerSpotlightProductResult[]> {
  "use cache"
  applyCache(
    [
      TAGS.products,
      TAGS.placement("partnerSpotlight"),
      TAGS.planFeature("partnerSpotlight"),
      TAGS.plans,
    ],
    600,
  )

  const effectiveLimit = Math.max(1, limit)
  const now = new Date()
  const partnerPlanIds = await getPartnerSpotlightPlanIds()
  if (!partnerPlanIds.length) {
    return []
  }

  const products = await prisma.product.findMany({
    where: {
      AND: [
        buildPublicDiscoveryProductWhere(),
        buildActivePlacementPlanFilter(partnerPlanIds, now),
      ],
    },
    orderBy: [
      { planAssignedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    take: effectiveLimit,
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      tagline: true,
    },
  })

  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline ?? null,
  }))
}

export async function getPartnerSpotlightProduct(
  rotationKey: string,
  limit = 100,
): Promise<PartnerSpotlightProduct | null> {
  "use cache"
  applyCache(
    [
      TAGS.products,
      TAGS.placement("partnerSpotlight"),
      TAGS.planFeature("partnerSpotlight"),
      TAGS.plans,
    ],
    DEFAULT_TTL.fast,
  )

  const products = await getPartnerSpotlightProducts(limit)

  if (!products.length) {
    return null
  }

  return [...products].sort((a, b) => {
    const aRank = stableUnitInterval(`partner-spotlight:${rotationKey}:${a.id}`)
    const bRank = stableUnitInterval(`partner-spotlight:${rotationKey}:${b.id}`)

    if (aRank !== bRank) return aRank - bRank
    return a.name.localeCompare(b.name)
  })[0]
}

// Get products that have the sponsored placement plan feature enabled
export async function getSponsoredProducts(limit = 12) {
  "use cache"
  applyCache(
    [
      TAGS.products,
      TAGS.placement("sponsoredProducts"),
      TAGS.planFeature("sponsoredProducts"),
      TAGS.plans,
    ],
    DEFAULT_TTL.fast,
  )

  const effectiveLimit = Math.max(1, limit)
  const now = new Date()
  const sponsoredPlanIds = await getSponsoredProductsPlanIds()
  if (!sponsoredPlanIds.length) {
    return []
  }

  const products = await prisma.product.findMany({
    where: {
      AND: [
        buildPublicDiscoveryProductWhere(),
        buildActivePlacementPlanFilter(sponsoredPlanIds, now),
      ],
    },
    orderBy: [
      { planAssignedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    take: effectiveLimit,
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      logo: true,
      bannerImage: true,
    },
  })

  const placements: SponsoredProductPlacement[] = []

  for (const product of products as SponsoredProduct[]) {
    placements.push({
      id: `plan:${product.id}`,
      product,
      origin: "plan",
    })
    if (placements.length >= effectiveLimit) break
  }

  return placements
}
