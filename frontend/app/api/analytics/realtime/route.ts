import { NextResponse } from "next/server"

import { getAnalyticsProvider } from "@/lib/server/analytics/store"

export async function GET() {
  try {
    const visitors = await getAnalyticsProvider("cache").getRealtimeVisitors()
    return NextResponse.json(
      { visitors },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("[analytics] failed to fetch realtime visitors", error)
    return NextResponse.json({ visitors: 1 }, { status: 200 })
  }
}
