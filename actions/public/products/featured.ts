import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

async function getProducts(badge: string) {
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

export async function getFeaturedProducts() {
  return getProducts("featured")
}

export async function getLatestLaunches() {
  return getProducts("new")
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
      _count: {
        select: {
          products: true,
        },
      },
    },
  })
}
