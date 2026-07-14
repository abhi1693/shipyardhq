import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { invalidateHistoricalPeriodicLeaderboardCache } from "@/actions/public/leaderboard/actions"
import {
  generateLeaderboardRun,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import {
  revalidateLeaderboard,
  revalidateMonthlyLeaderboard,
} from "@/lib/cache/revalidate"
import { toMonthKey } from "@/lib/server/leaderboard/months"

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
    if (result.deferred) {
      console.info("[leaderboard] refresh deferred", {
        periodStart: periodStart.toISOString(),
        windowEnd: result.windowEnd.toISOString(),
        reason: "analytics-pending",
      })
      return
    }

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

registerEventHandler({
  event: APP_EVENTS.PRODUCT_DELETED,
  id: "leaderboard.historical-cache-invalidate",
  mode: "async",
  queue: "low",
  handler: async (payload) => {
    await invalidateHistoricalPeriodicLeaderboardCache("product-deleted")
    console.info(
      "[leaderboard] historical cache invalidated for product delete",
      {
        productId: payload.productId,
      },
    )
  },
})

export {} // side-effect registration
