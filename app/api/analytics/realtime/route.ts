import { NextResponse } from "next/server"

import { getAnalyticsProvider } from "@/lib/server/analytics/store"

export async function GET() {
  try {
    const views = await getAnalyticsProvider("cache").getRealtimeVisitors()
    return NextResponse.json(
      { views: Math.max(0, views) },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("[analytics] failed to fetch recent page views", error)
    return NextResponse.json({ views: 0 }, { status: 200 })
  }
}
