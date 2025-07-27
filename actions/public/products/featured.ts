import prisma from "@/lib/prisma"

export async function getFeaturedProducts() {
  const now = new Date()

  return prisma.productBadge.findMany({
    where: {
      badge: { slug: "featured" },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      product: {
        include: {
          metadata: true,
          category: true,
          analytics: true,
          ProductBadge: {
            include: {
              badge: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
