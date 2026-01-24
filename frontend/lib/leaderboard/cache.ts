import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getLeaderboardPageApiV1PublicLeaderboardPageGet } from "@/lib/generated/fastapi/public-homepage"
import type { LeaderboardPagePayload as ApiLeaderboardPagePayload } from "@/lib/generated/fastapi/schemas"

const DEFAULT_LIMIT = 50

export type LeaderboardFilters = {
  categorySlug?: string
  limit: number
  verifiedRevenueOnly?: boolean
}

export type LeaderboardPagePayload = ApiLeaderboardPagePayload

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

    const response = await getLeaderboardPageApiV1PublicLeaderboardPageGet({
      category: filters.categorySlug,
      limit: filters.limit,
      verified: filters.verifiedRevenueOnly ? true : undefined,
    })
    const data = response.data
    if (typeof data !== "object" || data === null || !("filters" in data)) {
      throw new Error("Invalid leaderboard payload.")
    }
    return data
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
