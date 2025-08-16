import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function getProducts(badge: string) {
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
}

export async function getTrendingProducts(limit = 12) {
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
            gt: 0, // optional: only include products that got upvotes
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
          metadata: true, // if you also want this like in FeaturedProduct
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
}

export async function getTopCategories(limit = 10) {
  return prisma.category.findMany({
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
  })
}

// Get featured products filtered by category slug
export async function getFeaturedByCategorySlug(slug: string, limit = 6) {
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
}

// Get products that have the stickyBanner plan feature enabled
export async function getStickyBannerProducts(limit = 12) {
  return prisma.product.findMany({
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
  })
}
