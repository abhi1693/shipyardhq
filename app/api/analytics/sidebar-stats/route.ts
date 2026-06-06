import { NextResponse } from "next/server"

import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"

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
        pageViews30: 0,
        visitors30: 0,
        trafficSeries: [],
        realtimeVisitors: 1,
      },
      { status: 200 },
    )
  }
}
