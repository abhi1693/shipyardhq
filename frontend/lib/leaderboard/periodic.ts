import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import type { FastApiError } from "@/lib/fastapi-fetcher"
import { getPeriodicLeaderboardApiV1PublicLeaderboardPeriodicGet } from "@/lib/generated/fastapi/public-homepage"
import type {
  LeaderboardPeriod,
  PeriodicLeaderboardPayload,
} from "@/lib/generated/fastapi/schemas"

export type PeriodicLeaderboardParams = {
  period: LeaderboardPeriod
  year: number
  month?: number
  day?: number
  week?: number
  limit?: number
  verifiedRevenueOnly?: boolean
  categorySlug?: string | null
}

const normalizeCategorySlug = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export const getPeriodicLeaderboardByParams = cached(
  async (
    params: PeriodicLeaderboardParams,
  ): Promise<PeriodicLeaderboardPayload | null> => {
    const category = normalizeCategorySlug(params.categorySlug)

    try {
      const response =
        await getPeriodicLeaderboardApiV1PublicLeaderboardPeriodicGet({
          period: params.period,
          year: params.year,
          month: typeof params.month === "number" ? params.month : undefined,
          day: typeof params.day === "number" ? params.day : undefined,
          week: typeof params.week === "number" ? params.week : undefined,
          limit: typeof params.limit === "number" ? params.limit : undefined,
          verified: params.verifiedRevenueOnly ? true : undefined,
          category: category ?? undefined,
        })
      const data = response.data
      if (typeof data !== "object" || data === null || !("period" in data)) {
        throw new Error("Invalid periodic leaderboard payload.")
      }
      return data
    } catch (error) {
      const status = (error as FastApiError | undefined)?.status
      if (status === 404 || status === 422) {
        return null
      }
      throw error
    }
  },
  "leaderboard:periodic",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([params]) => {
      const category = normalizeCategorySlug(params.categorySlug)
      return [
        `period:${params.period}`,
        `year:${params.year}`,
        params.month ? `month:${params.month}` : null,
        params.day ? `day:${params.day}` : null,
        params.week ? `week:${params.week}` : null,
        typeof params.limit === "number" ? `limit:${params.limit}` : null,
        params.verifiedRevenueOnly ? "verifiedRevenueOnly:1" : null,
        category ? `category:${category}` : null,
      ].filter((value): value is string => Boolean(value))
    },
    tags: () => [
      TAGS.leaderboard,
      TAGS.leaderboardPage,
      TAGS.products,
      TAGS.analytics,
    ],
  },
)
