import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getLeaderboardStats,
  getTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"

const DEFAULT_LIMIT = 50

export type LeaderboardFilters = {
  categorySlug?: string
  limit: number
}

type LeaderboardProduct = Awaited<
  ReturnType<typeof getTopRankedProducts>
>[number]
type LeaderboardCategory = Awaited<
  ReturnType<typeof getCategoriesWithCounts>
>[number]

export type LeaderboardPagePayload = {
  filters: LeaderboardFilters
  stats: Awaited<ReturnType<typeof getLeaderboardStats>>
  categories: LeaderboardCategory[]
  products: LeaderboardProduct[]
  rankLabels: string[]
  firstPlacement: LeaderboardProduct | null
  runnerUps: LeaderboardProduct[]
  rest: LeaderboardProduct[]
  categoryName?: string
}

const normalizeFilters = (filters: LeaderboardFilters): LeaderboardFilters => {
  const limit =
    Number.isFinite(filters.limit) && filters.limit > 0
      ? Math.min(Math.max(Math.trunc(filters.limit), 1), 100)
      : DEFAULT_LIMIT
  const categorySlug =
    filters.categorySlug && filters.categorySlug.trim().length
      ? filters.categorySlug.trim()
      : undefined
  return { limit, categorySlug }
}

export const getLeaderboardPagePayload = cached(
  async (input: LeaderboardFilters): Promise<LeaderboardPagePayload> => {
    const filters = normalizeFilters(input)

    const [stats, categories, products] = await Promise.all([
      getLeaderboardStats(),
      getCategoriesWithCounts(),
      getTopRankedProducts({
        limit: filters.limit,
        categorySlug: filters.categorySlug,
      }),
    ])

    const topThree = products.slice(0, 3)
    const firstPlacement = topThree[0] ?? null
    const runnerUps = topThree.slice(1)
    const rest = products.slice(3)
    const categoryName = filters.categorySlug
      ? categories.find(
          (category: (typeof categories)[number]) =>
            category.slug === filters.categorySlug,
        )?.name
      : undefined

    return {
      filters,
      stats,
      categories,
      products,
      rankLabels: ["Top rank", "Second place", "Third place"],
      firstPlacement,
      runnerUps,
      rest,
      categoryName,
    }
  },
  "leaderboard:page:payload",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([filters]) => {
      const parts = [
        filters.categorySlug ? `category:${filters.categorySlug}` : null,
        `limit:${filters.limit}`,
      ].filter((value): value is string => Boolean(value))
      return parts
    },
    tags: () => [
      TAGS.leaderboardPage,
      TAGS.leaderboard,
      TAGS.categories,
      TAGS.products,
      TAGS.analytics,
    ],
  },
)
