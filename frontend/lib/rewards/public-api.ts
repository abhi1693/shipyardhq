import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicRewardsDataApiV1PublicRewardsDataGet,
  getPublicRewardsStatsApiV1PublicRewardsStatsGet,
  getRewardsLeaderboardPageApiV1PublicRewardsLeaderboardGet,
} from "@/lib/generated/fastapi/public-homepage"
import type {
  PublicRewardsData,
  PublicRewardsStats,
  RewardsLeaderboardPageResult,
} from "@/lib/generated/fastapi/schemas"
import {
  normalizeRewardsLeaderboardPage,
  normalizeRewardsLeaderboardPageSize,
} from "@/lib/rewards/leaderboard"

export const getPublicRewardsStats = cached(
  async (): Promise<PublicRewardsStats> => {
    const response = await getPublicRewardsStatsApiV1PublicRewardsStatsGet()
    return response.data
  },
  "rewards:public-stats",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.rewards, "rewards:stats"],
  },
)

export const getPublicRewardsData = cached(
  async (): Promise<PublicRewardsData> => {
    const response = await getPublicRewardsDataApiV1PublicRewardsDataGet()
    return response.data
  },
  "rewards:public-data",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.rewards],
  },
)

export const getRewardsLeaderboardPage = cached(
  async (
    params: { page?: number; pageSize?: number } = {},
  ): Promise<RewardsLeaderboardPageResult> => {
    const page = normalizeRewardsLeaderboardPage(params.page)
    const pageSize = normalizeRewardsLeaderboardPageSize(params.pageSize)

    const response =
      await getRewardsLeaderboardPageApiV1PublicRewardsLeaderboardGet({
        page,
        pageSize,
      })

    const data = response.data
    if (typeof data !== "object" || data === null || !("items" in data)) {
      throw new Error("Invalid rewards leaderboard payload.")
    }
    return data
  },
  "rewards:leaderboard:page",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([params]) => [
      `page:${normalizeRewardsLeaderboardPage(params?.page)}`,
      `size:${normalizeRewardsLeaderboardPageSize(params?.pageSize)}`,
    ],
    tags: () => [TAGS.rewards, TAGS.rewardsLeaderboard],
  },
)
