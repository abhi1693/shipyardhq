import prisma from "@/lib/prisma"

export async function getPublicProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      metadata: true,
      analytics: true,
      verification: true,
      ProductMedia: { orderBy: { createdAt: "asc" } },
      ProductBadge: true,
      plan: true,
      organization: true,
    },
  })

  if (!product) return null

  // Filter expired badges
  const activeBadges = product.ProductBadge.filter(
    (b) => !b.expiresAt || b.expiresAt > new Date(),
  ).map((b) => b.badge)

  return { ...product, badges: activeBadges }
}

export async function getRelatedProductsByCategory(
  categoryId: string,
  excludeId: string,
) {
  return prisma.product.findMany({
    where: { categoryId, NOT: { id: excludeId } },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { analytics: true },
  })
}
