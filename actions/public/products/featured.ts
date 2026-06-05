import prisma from "@/lib/prisma"
import { PlacementStatus, Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { stableUnitInterval } from "@/lib/stable-random"
import type { FeaturedProduct } from "@/types"
import { featuredProductSelect } from "@/types"

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
  origin: "schedule" | "plan"
  schedule?: {
    id: string
    slotKey: string
    startsAt: Date
    endsAt: Date
    redemptionId: string | null
  }
}

export const getProducts = cached(
  async (badge: string, limit = 24): Promise<FeaturedProduct[]> => {
    const now = new Date()
    const entries = await prisma.productBadge.findMany({
      where: {
        badge,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      take: limit,
      select: featuredProductSelect,
      orderBy: { createdAt: "asc" },
    })

    return entries as unknown as FeaturedProduct[]
  },
  "products:by-badge",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([badge]) => [TAGS.products, TAGS.badges, `badge:${badge}`],
    keyParts: ([badge, limit]) => {
      const parts = [`badge:${badge}`]
      if (typeof limit === "number") {
        parts.push(`limit:${limit}`)
      }
      return parts
    },
  },
)

export const getTrendingProducts = cached(
  async (limit = 12) => {
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
        product: {
          createdAt: { lte: new Date() },
          updatedAt: { gte: yesterday },
          analytics: {
            upvotes: {
              gt: 0,
            },
          },
        },
      },
      select: featuredProductSelect,
    })

    return trending as unknown as Prisma.ProductBadgeGetPayload<{
      select: typeof featuredProductSelect
    }>[]
  },
  "products:trending",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [
      TAGS.products,
      TAGS.trending,
      TAGS.leaderboard,
      TAGS.analytics,
    ],
  },
)

export const getTopCategories = cached(
  async (limit = 12) =>
    prisma.category.findMany({
      orderBy: {
        products: {
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
            products: true,
          },
        },
      },
    }),
  "categories:top",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.categories] },
)

// Get featured products filtered by category slug
export const getFeaturedByCategorySlug = cached(
  async (slug: string, limit = 6): Promise<FeaturedProduct[]> => {
    const now = new Date()
    const entries = await prisma.productBadge.findMany({
      where: {
        badge: "featured",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        product: { category: { slug } },
      },
      select: featuredProductSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return entries as unknown as FeaturedProduct[]
  },
  "products:featured-by-category",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([slug]) => [
      TAGS.products,
      TAGS.featured,
      TAGS.badges,
      TAGS.category(String(slug)),
    ],
  },
)

// Get products that have the stickyBanner plan feature enabled
type StickyBannerProductResult = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string | null
}

export type PartnerSpotlightProduct = StickyBannerProductResult

type StickyBannerProduct = Prisma.ProductGetPayload<{
  select: {
    id: true
    slug: true
    name: true
    logo: true
    tagline: true
  }
}>

export const getStickyBannerProducts = cached(
  async (limit = 100): Promise<StickyBannerProductResult[]> => {
    const now = new Date()
    const effectiveLimit = Math.max(1, limit)

    const stickyFeatureKey = "stickyBanner"
    const activeStatus = PlacementStatus.active

    const scheduledIds = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT ids.id
        FROM (
          SELECT p.id,
                 MIN(ps."startsAt") AS starts_at,
                 MIN(ps."createdAt") AS created_at
          FROM "PlacementSchedule" AS ps
          INNER JOIN "Product" AS p ON p.id = ps."productId"
          WHERE ps."featureKey" = ${stickyFeatureKey}
            AND ps.status = CAST(${activeStatus} AS "PlacementStatus")
            AND ps."startsAt" <= ${now}
            AND ps."endsAt" >= ${now}
            AND p.status = 'published'
          GROUP BY p.id
        ) AS ids
        ORDER BY ids.starts_at ASC, ids.created_at ASC, ids.id ASC
        LIMIT ${effectiveLimit}
      `,
    )

    const remaining = Math.max(effectiveLimit - scheduledIds.length, 0)
    const scheduledIdValues = scheduledIds.map(
      (entry: { id: string }) => entry.id,
    )

    const exclusionClause =
      scheduledIdValues.length > 0
        ? Prisma.sql`AND p.id NOT IN (${Prisma.join(scheduledIdValues)})`
        : Prisma.sql``

    const planIds =
      remaining > 0
        ? await prisma.$queryRaw<{ id: string }[]>(
            Prisma.sql`
              SELECT ids.id
              FROM (
                SELECT p.id,
                       COALESCE(p."planAssignedAt", p."createdAt") AS assigned_at,
                       p."createdAt" AS created_at
                FROM "Product" AS p
                WHERE p.status = 'published'
                  AND EXISTS (
                    SELECT 1
                    FROM "PlanFeatureAssignment" AS a
                    INNER JOIN "PlanFeature" AS f
                      ON f.id = a."featureId"
                    WHERE a."planId" = p."planId"
                      AND a.enabled = true
                      AND f.key = ${stickyFeatureKey}
                  )
                  ${exclusionClause}
              ) AS ids
              ORDER BY ids.assigned_at DESC, ids.created_at DESC, ids.id ASC
              LIMIT ${remaining}
            `,
          )
        : []

    const combinedIds = [
      ...scheduledIdValues,
      ...planIds.map((entry: { id: string }) => entry.id),
    ]

    if (!combinedIds.length) {
      return []
    }

    const products: StickyBannerProduct[] = await prisma.product.findMany({
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
  },
  "products:sticky-banner:v2",
  {
    ttl: 600,
    tags: () => [
      TAGS.products,
      TAGS.placement("stickyBanner"),
      TAGS.planFeature("stickyBanner"),
      TAGS.plans,
    ],
  },
)

export const getPartnerSpotlightProduct = cached(
  async (
    rotationKey: string,
    limit = 100,
  ): Promise<PartnerSpotlightProduct | null> => {
    const products = await getStickyBannerProducts(limit)

    if (!products.length) {
      return null
    }

    return [...products].sort((a, b) => {
      const aRank = stableUnitInterval(
        `partner-spotlight:${rotationKey}:${a.id}`,
      )
      const bRank = stableUnitInterval(
        `partner-spotlight:${rotationKey}:${b.id}`,
      )

      if (aRank !== bRank) return aRank - bRank
      return a.name.localeCompare(b.name)
    })[0]
  },
  "products:partner-spotlight:v1",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([rotationKey, limit]) => [
      `rotation:${rotationKey}`,
      `limit:${limit ?? 100}`,
    ],
    tags: () => [
      TAGS.products,
      TAGS.placement("stickyBanner"),
      TAGS.planFeature("stickyBanner"),
      TAGS.plans,
    ],
  },
)

const SPONSORED_PLACEMENT_FEATURE_KEY = "sponsoredProducts" as const

// Get products that have the sponsored placement plan feature enabled
export const getSponsoredProducts = cached(
  async (limit = 12) => {
    const now = new Date()
    const effectiveLimit = Math.max(1, limit)
    const sponsoredFeatureKey = SPONSORED_PLACEMENT_FEATURE_KEY
    const activeStatus = PlacementStatus.active

    const scheduledRows = await prisma.$queryRaw<
      {
        scheduleId: string
        productId: string
        slotKey: string
        startsAt: Date
        endsAt: Date
        redemptionId: string | null
      }[]
    >(
      Prisma.sql`
        SELECT ps.id AS "scheduleId",
               ps."productId" AS "productId",
               ps."slotKey" AS "slotKey",
               ps."startsAt" AS "startsAt",
               ps."endsAt" AS "endsAt",
               ps."redemptionId" AS "redemptionId"
        FROM "PlacementSchedule" AS ps
        INNER JOIN "Product" AS p ON p.id = ps."productId"
        WHERE ps."featureKey" = ${sponsoredFeatureKey}
          AND ps.status = CAST(${activeStatus} AS "PlacementStatus")
          AND ps."startsAt" <= ${now}
          AND ps."endsAt" >= ${now}
          AND p.status = 'published'
        ORDER BY RANDOM()
        LIMIT ${effectiveLimit}
      `,
    )

    const scheduledProductIds = scheduledRows.map(
      (row: { productId: string }) => row.productId,
    )
    const remaining = Math.max(effectiveLimit - scheduledRows.length, 0)

    const exclusionClause =
      scheduledProductIds.length > 0
        ? Prisma.sql`AND p.id NOT IN (${Prisma.join(scheduledProductIds)})`
        : Prisma.sql``

    const planRows =
      remaining > 0
        ? await prisma.$queryRaw<{ id: string }[]>(
            Prisma.sql`
              SELECT ids.id
              FROM (
                SELECT DISTINCT p.id
                FROM "Product" AS p
                WHERE p.status = 'published'
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
                  ${exclusionClause}
              ) AS ids
              ORDER BY RANDOM()
              LIMIT ${remaining}
            `,
          )
        : []

    const productIds = [
      ...scheduledProductIds,
      ...planRows.map((row: { id: string }) => row.id),
    ]

    if (!productIds.length) {
      return []
    }

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
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
      products.map((product: (typeof products)[number]) => [
        product.id,
        product,
      ]),
    )
    const placements: SponsoredProductPlacement[] = []
    const seen = new Set<string>()

    for (const row of scheduledRows) {
      const product = productMap.get(row.productId) as
        | SponsoredProduct
        | undefined
      if (!product || seen.has(product.id)) continue
      seen.add(product.id)
      placements.push({
        id: `schedule:${row.scheduleId}`,
        product,
        origin: "schedule",
        schedule: {
          id: row.scheduleId,
          slotKey: row.slotKey,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          redemptionId: row.redemptionId ?? null,
        },
      })
      if (placements.length >= effectiveLimit) break
    }

    if (placements.length < effectiveLimit) {
      for (const planRow of planRows) {
        const product = productMap.get(planRow.id) as
          | SponsoredProduct
          | undefined
        if (!product || seen.has(product.id)) continue
        seen.add(product.id)
        placements.push({
          id: `plan:${planRow.id}`,
          product,
          origin: "plan",
        })
        if (placements.length >= effectiveLimit) break
      }
    }

    return placements
  },
  "products:sponsored-products",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [
      TAGS.products,
      TAGS.placement("sponsoredProducts"),
      TAGS.planFeature("sponsoredProducts"),
      TAGS.plans,
    ],
    keyParts: ([limit]) => [`limit:${limit ?? 12}`],
  },
)
