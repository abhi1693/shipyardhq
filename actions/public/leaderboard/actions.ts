import prisma from "@/lib/prisma"

export async function getLeaderboardStats() {
  const [totalProducts, totalCreators, upvoteAgg, topProduct] =
    await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.productAnalytics.aggregate({ _sum: { upvotes: true } }),
      prisma.productAnalytics.findFirst({
        orderBy: { upvotes: "desc" },
        select: { upvotes: true },
      }),
    ])

  return {
    totalProducts,
    totalCreators,
    totalUpvotes: upvoteAgg._sum.upvotes ?? 0,
    topScore: topProduct?.upvotes ?? 0,
  }
}

export async function getTopRankedProducts(limit = 50) {
  return prisma.product.findMany({
    take: limit,
    orderBy: {
      analytics: {
        upvotes: "desc",
      },
    },
    include: {
      category: true,
      user: true,
      analytics: true,
    },
  })
}
