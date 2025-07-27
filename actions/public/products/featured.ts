import prisma from "@/lib/prisma"

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
