import prisma from "@/lib/prisma"
import { PlacementStatus, Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import type { FeaturedProduct } from "@/types"
import { featuredProductSelect } from "@/types"

type HomepageProduct = Prisma.ProductGetPayload<{
  include: {
    category: true
    user: true
    analytics: true
    ProductBadge: true
    plan: {
      select: {
        id: true
        price: true
      }
    }
  }
}>

export type HomepageFeaturePlacement = {
  id: string
  product: HomepageProduct
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
export const getStickyBannerProducts = cached(
  async (limit = 100) => {
    const now = new Date()
    const effectiveLimit = Math.max(1, limit)

    const stickyFeatureKey = "stickyBanner"
    const activeStatus = PlacementStatus.active

    const scheduledIds = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT DISTINCT p.id
        FROM "PlacementSchedule" AS ps
        INNER JOIN "Product" AS p ON p.id = ps."productId"
        WHERE ps."featureKey" = ${stickyFeatureKey}
          AND ps.status = ${activeStatus}
          AND ps."startsAt" <= ${now}
          AND ps."endsAt" >= ${now}
          AND p.status = 'published'
        ORDER BY RANDOM()
        LIMIT ${effectiveLimit}
      `,
    )

    const remaining = Math.max(effectiveLimit - scheduledIds.length, 0)
    const scheduledIdValues = scheduledIds.map((entry) => entry.id)

    const exclusionClause =
      scheduledIdValues.length > 0
        ? Prisma.sql`AND p.id NOT IN (${Prisma.join(scheduledIdValues)})`
        : Prisma.sql``

    const planIds =
      remaining > 0
        ? await prisma.$queryRaw<{ id: string }[]>(
            Prisma.sql`
              SELECT p.id
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
              ORDER BY RANDOM()
              LIMIT ${remaining}
            `,
          )
        : []

    const combinedIds = [
      ...scheduledIdValues,
      ...planIds.map((entry) => entry.id),
    ]

    if (!combinedIds.length) {
      return []
    }

    const products = await prisma.product.findMany({
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

    const uniqueProducts = Array.from(
      new Map(products.map((product) => [product.id, product])).values(),
    )

    return uniqueProducts.slice(0, effectiveLimit).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      logo: product.logo,
      tagline: product.tagline ?? null,
    }))
  },
  "products:sticky-banner",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [
      TAGS.products,
      TAGS.placement("stickyBanner"),
      TAGS.planFeature("stickyBanner"),
      TAGS.plans,
    ],
  },
)

// Get products that have the homepage plan feature enabled (for homepage spotlight)
export const getHomepageFeatureProducts = cached(
  async (limit = 12) => {
    const now = new Date()
    const [schedules, planProducts] = await Promise.all([
      prisma.placementSchedule.findMany({
        where: {
          featureKey: "homepage",
          status: PlacementStatus.active,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        include: {
          product: {
            include: {
              category: true,
              user: true,
              analytics: true,
              ProductBadge: true,
              plan: {
                select: {
                  id: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: { startsAt: "asc" },
        take: limit,
      }),
      prisma.product.findMany({
        where: {
          status: "published" as any,
          plan: {
            is: {
              assignments: {
                some: {
                  enabled: true,
                  feature: { is: { key: "homepage" } },
                },
              },
            },
          },
        },
        include: {
          category: true,
          user: true,
          analytics: true,
          ProductBadge: true,
          plan: {
            select: {
              id: true,
              price: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
    ])

    const seen = new Set<string>()
    const placements: HomepageFeaturePlacement[] = []

    for (const entry of schedules) {
      const product = entry.product
      if (!product || seen.has(product.id)) continue
      seen.add(product.id)
      placements.push({
        id: `schedule:${entry.id}`,
        product,
        origin: "schedule",
        schedule: {
          id: entry.id,
          slotKey: entry.slotKey,
          startsAt: entry.startsAt,
          endsAt: entry.endsAt,
          redemptionId: entry.redemptionId ?? null,
        },
      })
      if (placements.length >= limit) return placements
    }

    for (const product of planProducts) {
      if (seen.has(product.id)) continue
      seen.add(product.id)
      placements.push({
        id: `plan:${product.id}`,
        product,
        origin: "plan",
      })
      if (placements.length >= limit) break
    }

    return placements
  },
  "products:homepage-feature",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [
      TAGS.products,
      TAGS.placement("homepage"),
      TAGS.planFeature("homepage"),
      TAGS.plans,
    ],
  },
)
