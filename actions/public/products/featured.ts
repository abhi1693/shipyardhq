import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

export const getProducts = cached(
  async (badge: string) => {
    const now = new Date()
    return prisma.productBadge.findMany({
      where: {
        badge,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        product: {
          include: {
            metadata: true,
            category: true,
            analytics: true,
            user: true,
            ProductBadge: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
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
      include: {
        product: {
          include: {
            category: true,
            user: true,
            analytics: true,
            ProductBadge: true,
            metadata: true,
          },
        },
      },
    })

    return trending satisfies Prisma.ProductBadgeGetPayload<{
      include: {
        product: {
          include: {
            category: true
            user: true
            analytics: true
            ProductBadge: true
            metadata: true
          }
        }
      }
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
  async (slug: string, limit = 6) => {
    const now = new Date()
    return prisma.productBadge.findMany({
      where: {
        badge: "featured",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        product: { category: { slug } },
      },
      include: {
        product: {
          include: {
            metadata: true,
            category: true,
            analytics: true,
            user: true,
            ProductBadge: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
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
