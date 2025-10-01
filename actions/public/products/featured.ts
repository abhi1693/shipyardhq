import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  accelerateTags,
  cached,
  DEFAULT_TTL,
  DEFAULT_SWR,
  TAGS,
} from "@/lib/cache"
import type { FeaturedProduct } from "@/types"
import { featuredProductSelect } from "@/types"

export const getProducts = cached(
  async (badge: string): Promise<FeaturedProduct[]> => {
    const now = new Date()
    const entries = await prisma.productBadge.findMany({
      where: {
        badge,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      take: 24,
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([TAGS.products, TAGS.badges, `badge:${badge}`]),
      },
      select: featuredProductSelect,
      orderBy: { createdAt: "asc" },
    })

    return entries as unknown as FeaturedProduct[]
  },
  "products:by-badge",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([badge]) => [TAGS.products, TAGS.badges, `badge:${badge}`],
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.products,
          TAGS.trending,
          TAGS.leaderboard,
          TAGS.analytics,
        ]),
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: accelerateTags([TAGS.categories]),
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.products,
          TAGS.featured,
          TAGS.badges,
          TAGS.category(String(slug)),
        ]),
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
  async (limit = 12) =>
    prisma.product.findMany({
      where: {
        status: "published" as any,
        plan: {
          is: {
            assignments: {
              some: {
                enabled: true,
                feature: { is: { key: "stickyBanner" } },
              },
            },
          },
        },
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.products,
          TAGS.planFeature("stickyBanner"),
          TAGS.plans,
        ]),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  "products:sticky-banner",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.products, TAGS.planFeature("stickyBanner"), TAGS.plans],
  },
)

// Get products that have the homepage plan feature enabled (for homepage spotlight)
export const getHomepageFeatureProducts = cached(
  async (limit = 12) =>
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.products,
          TAGS.planFeature("homepage"),
          TAGS.plans,
        ]),
      },
      include: {
        category: true,
        user: true,
        analytics: true,
        ProductBadge: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  "products:homepage-feature",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.products, TAGS.planFeature("homepage"), TAGS.plans],
  },
)
