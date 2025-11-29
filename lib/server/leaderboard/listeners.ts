import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  generateLeaderboardRun,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import { revalidateLeaderboard, revalidateMonthlyLeaderboard } from "@/lib/cache/revalidate"
import { toMonthKey } from "@/lib/server/monthlyLeaderboard"

registerEventHandler({
  event: APP_EVENTS.LEADERBOARD_REFRESH,
  id: "leaderboard.refresh-run",
  mode: "async",
  queue: "low",
  handler: async (payload) => {
    const asOf = payload?.asOf ? new Date(payload.asOf) : new Date()
    const { periodStart, periodEnd } = getCurrentLeaderboardWindow(asOf)

    console.info("[leaderboard] refresh start", {
      asOf: asOf.toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    })

    const result = await generateLeaderboardRun({
      periodStart,
      periodEnd,
      asOf,
    })

    const monthKey = toMonthKey(periodStart)
    revalidateLeaderboard("revalidate")
    revalidateMonthlyLeaderboard(monthKey, "revalidate")

    console.info("[leaderboard] refresh complete", {
      runId: result.runId,
      scores: result.scores,
      windowEnd: result.windowEnd.toISOString(),
    })
  },
})

export {} // side-effect registration
