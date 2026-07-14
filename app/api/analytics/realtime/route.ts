import { connection, NextResponse } from "next/server"

import { getAnalyticsProvider } from "@/lib/server/analytics/store"

const REALTIME_CACHE_CONTROL = "private, no-store, max-age=0"

export async function GET() {
  await connection()

  try {
    const views = await getAnalyticsProvider("cache").getRealtimeVisitors()
    return NextResponse.json(
      { views: Math.max(0, views) },
      {
        status: 200,
        headers: {
          "cache-control": REALTIME_CACHE_CONTROL,
        },
      },
    )
  } catch (error) {
    console.error("[analytics] failed to fetch recent page views", error)
    return NextResponse.json(
      { views: 0 },
      {
        status: 200,
        headers: {
          "cache-control": REALTIME_CACHE_CONTROL,
        },
      },
    )
  }
}
