import prisma from "@/lib/prisma"

export async function getPublicProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        include: {
          useCases: {
            include: { useCase: true },
          },
        },
      },
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      metadata: true,
      analytics: true,
      verification: true,
      ProductMedia: { orderBy: { createdAt: "asc" } },
      ProductBadge: true,
      plan: {
        include: {
          assignments: {
            include: { feature: true },
          },
        },
      },
      organization: {
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
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

export async function hasUserUpvoted(productId: string, clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return false
  const existing = await (prisma as any).productUpvote.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { id: true },
  })
  return !!existing
}
