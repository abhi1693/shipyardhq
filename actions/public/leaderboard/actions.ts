import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

export const getLeaderboardStats = cached(
  async () => {
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
  },
  "leaderboard:stats",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.leaderboard, TAGS.analytics, TAGS.products],
  },
)

export const getTopRankedProducts = cached(
  async (args?: { limit?: number; categorySlug?: string }) => {
    const limit = args?.limit ?? 50
    const categorySlug = args?.categorySlug
    return prisma.product.findMany({
      take: limit,
      where: categorySlug ? { category: { slug: categorySlug } } : undefined,
      orderBy: {
        analytics: {
          upvotes: "desc",
        },
      },
      include: {
        category: true,
        user: true,
        analytics: true,
        ProductBadge: true,
      },
    })
  },
  "leaderboard:top-products",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([args]) => [
      TAGS.leaderboard,
      TAGS.products,
      TAGS.analytics,
      TAGS.categories,
      TAGS.category(String(args?.categorySlug ?? "all")),
    ],
  },
)
