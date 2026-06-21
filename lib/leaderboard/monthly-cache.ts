import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
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

export async function getMonthlyLeaderboardPagePayload(
  month?: string,
): Promise<MonthlyLeaderboardPagePayload> {
  "use cache"
  applyCache(
    [
      "leaderboard:monthly:page",
      TAGS.monthlyLeaderboard,
      TAGS.monthlyLeaderboardMonth(month ?? "resolved"),
      TAGS.leaderboardPage,
    ],
    DEFAULT_TTL.slowest,
  )

  const [months, leaderboard] = await Promise.all([
    getMonthlyLeaderboardMonths(),
    getMonthlyTopRankedProducts({ month }),
  ])

  return {
    leaderboard,
    months,
  }
}
