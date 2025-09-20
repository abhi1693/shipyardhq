import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_TTL,
  DEFAULT_SWR,
  TAGS,
} from "@/lib/cache"

export const getLeaderboardStats = cached(
  async () => {
    const [totalProducts, totalCreators, upvoteAgg, topProduct] =
      await Promise.all([
        prisma.product.count({
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.products, TAGS.leaderboard]),
          },
        }),
        prisma.user.count({
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.users, TAGS.leaderboard]),
          },
        }),
        prisma.productAnalytics.aggregate({
          _sum: { upvotes: true },
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.analytics, TAGS.leaderboard]),
          },
        }),
        prisma.productAnalytics.findFirst({
          orderBy: { upvotes: "desc" },
          select: { upvotes: true },
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.analytics, TAGS.leaderboard]),
          },
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.leaderboard,
          TAGS.products,
          TAGS.analytics,
          TAGS.categories,
          TAGS.category(String(categorySlug ?? "all")),
        ]),
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
