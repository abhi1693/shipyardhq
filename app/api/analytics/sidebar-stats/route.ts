import { NextResponse } from "next/server"

import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"

export async function GET() {
  try {
    const stats = await getLeaderboardStats()

    return NextResponse.json(stats, {
      status: 200,
      headers: {
        "cache-control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("[analytics] failed to fetch sidebar stats", error)
    return NextResponse.json(
      {
        analyticsWindowDays: ANALYTICS_REPORTING_WINDOW_DAYS,
        pageViews: 0,
        visitors: 0,
        trafficSeries: [],
        realtimeVisitors: 0,
      },
      { status: 200 },
    )
  }
}
