import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { stableUnitInterval } from "@/lib/stable-random"
import type { FeaturedProduct } from "@/types"
import { featuredProductSelect } from "@/types"
import {
  buildPublicDiscoveryProductWhere,
  buildPublicDiscoverySqlFilter,
} from "@/lib/products/public-discovery"

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

  return entries as unknown as FeaturedProduct[]
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

  return trending as unknown as Prisma.ProductBadgeGetPayload<{
    select: typeof featuredProductSelect
  }>[]
}

export async function getTopCategories(limit = 12) {
  "use cache"
  applyCache([TAGS.categories], DEFAULT_TTL.slow)

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

  return entries as unknown as FeaturedProduct[]
}

const PARTNER_SPOTLIGHT_FEATURE_KEY = "partnerSpotlight" as const

// Get published products whose assigned plan includes Partner Spotlight.
type PartnerSpotlightProductResult = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string | null
}

export type PartnerSpotlightProduct = PartnerSpotlightProductResult

type PartnerSpotlightPlacementProduct = Prisma.ProductGetPayload<{
  select: {
    id: true
    slug: true
    name: true
    logo: true
    tagline: true
  }
}>

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

  const planIds = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
        SELECT ids.id
        FROM (
          SELECT p.id,
                 COALESCE(p."planAssignedAt", p."createdAt") AS assigned_at,
                 p."createdAt" AS created_at
          FROM "Product" AS p
          WHERE p.status = 'published'
            ${buildPublicDiscoverySqlFilter("p")}
            AND p."planId" IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM "PlanFeatureAssignment" AS a
              INNER JOIN "PlanFeature" AS f
                ON f.id = a."featureId"
              WHERE a."planId" = p."planId"
                AND a.enabled = true
                AND f.key = ${PARTNER_SPOTLIGHT_FEATURE_KEY}
            )
        ) AS ids
        ORDER BY ids.assigned_at DESC, ids.created_at DESC, ids.id ASC
        LIMIT ${effectiveLimit}
      `,
  )

  const combinedIds = planIds.map((entry: { id: string }) => entry.id)

  if (!combinedIds.length) {
    return []
  }

  const products: PartnerSpotlightPlacementProduct[] =
    await prisma.product.findMany({
      where: {
        id: {
          in: combinedIds,
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        tagline: true,
      },
    })

  type FeaturedProductRecord = (typeof products)[number]
  const productMap: Map<string, FeaturedProductRecord> = new Map(
    products.map((product) => [product.id, product]),
  )
  const ordered: typeof products = []
  const seen = new Set<string>()

  for (const id of combinedIds) {
    const product = productMap.get(id)
    if (!product || seen.has(id)) {
      continue
    }
    ordered.push(product)
    seen.add(id)
    if (ordered.length >= effectiveLimit) {
      break
    }
  }

  const pool = ordered.length > 0 ? ordered : products

  if (!pool.length) {
    return []
  }

  return pool.map((product) => ({
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

const SPONSORED_PLACEMENT_FEATURE_KEY = "sponsoredProducts" as const

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
  const sponsoredFeatureKey = SPONSORED_PLACEMENT_FEATURE_KEY

  const planRows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
        SELECT ids.id
        FROM (
          SELECT DISTINCT p.id
          FROM "Product" AS p
          WHERE p.status = 'published'
            ${buildPublicDiscoverySqlFilter("p")}
            AND p."planId" IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM "PlanFeatureAssignment" AS a
              INNER JOIN "PlanFeature" AS f
                ON f.id = a."featureId"
              WHERE a."planId" = p."planId"
                AND a.enabled = true
                AND f.key = ${sponsoredFeatureKey}
            )
        ) AS ids
        ORDER BY RANDOM()
        LIMIT ${effectiveLimit}
      `,
  )

  const productIds = planRows.map((row: { id: string }) => row.id)

  if (!productIds.length) {
    return []
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
      ...buildPublicDiscoveryProductWhere(),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      logo: true,
      bannerImage: true,
    },
  })

  const productMap = new Map(
    products.map((product: (typeof products)[number]) => [product.id, product]),
  )
  const placements: SponsoredProductPlacement[] = []
  const seen = new Set<string>()

  for (const planRow of planRows) {
    const product = productMap.get(planRow.id) as SponsoredProduct | undefined
    if (!product || seen.has(product.id)) continue
    seen.add(product.id)
    placements.push({
      id: `plan:${planRow.id}`,
      product,
      origin: "plan",
    })
    if (placements.length >= effectiveLimit) break
  }

  return placements
}
