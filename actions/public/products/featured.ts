import prisma from "@/lib/prisma"

export async function getFeaturedProducts() {
  const now = new Date()

  return prisma.productBadge.findMany({
    where: {
      badge: "featured",
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
