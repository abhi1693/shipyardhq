import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getLeaderboardStats,
  getTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { getCategoriesDirectoryApiV1PublicCategoriesDirectoryGet } from "@/lib/generated/fastapi/public-homepage"
import type { CategorySummary } from "@/lib/generated/fastapi/schemas"

const DEFAULT_LIMIT = 50

export type LeaderboardFilters = {
  categorySlug?: string
  limit: number
  verifiedRevenueOnly?: boolean
}

type LeaderboardProduct = Awaited<
  ReturnType<typeof getTopRankedProducts>
>[number]
type LeaderboardCategory = CategorySummary

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
  return {
    limit,
    categorySlug,
    verifiedRevenueOnly: Boolean(filters.verifiedRevenueOnly),
  }
}

export const getLeaderboardPagePayload = cached(
  async (input: LeaderboardFilters): Promise<LeaderboardPagePayload> => {
    const filters = normalizeFilters(input)

    const [stats, categoriesResponse, products] = await Promise.all([
      getLeaderboardStats(),
      getCategoriesDirectoryApiV1PublicCategoriesDirectoryGet(),
      getTopRankedProducts({
        limit: filters.limit,
        categorySlug: filters.categorySlug,
        verifiedRevenueOnly: filters.verifiedRevenueOnly,
      }),
    ])
    const categories = categoriesResponse.data.categories

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
        filters.verifiedRevenueOnly ? "verifiedRevenueOnly:1" : null,
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
