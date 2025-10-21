import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getMonthlyLeaderboardMonths,
  getMonthlyTopRankedProducts,
} from "@/actions/public/leaderboard/actions"

type MonthlyLeaderboard = Awaited<
  ReturnType<typeof getMonthlyTopRankedProducts>
>

type MonthlyLeaderboardMonths = Awaited<
  ReturnType<typeof getMonthlyLeaderboardMonths>
>

export type MonthlyLeaderboardPagePayload = {
  leaderboard: MonthlyLeaderboard
  months: MonthlyLeaderboardMonths
}

export const getMonthlyLeaderboardPagePayload = cached(
  async (month?: string): Promise<MonthlyLeaderboardPagePayload> => {
    const [months, leaderboard] = await Promise.all([
      getMonthlyLeaderboardMonths(),
      getMonthlyTopRankedProducts({ month }),
    ])

    return {
      leaderboard,
      months,
    }
  },
  "leaderboard:monthly:page",
  {
    ttl: DEFAULT_TTL.slowest,
    keyParts: ([month]) => [month ?? "latest"],
    tags: ([month]) => [
      TAGS.monthlyLeaderboard,
      TAGS.monthlyLeaderboardMonth(month ?? "resolved"),
      TAGS.leaderboardPage,
    ],
  },
)
