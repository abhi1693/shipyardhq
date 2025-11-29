import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { dispatchEvent } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const now = new Date()

  try {
    await dispatchEvent(APP_EVENTS.LEADERBOARD_REFRESH, { asOf: now.toISOString() })

    return NextResponse.json({ success: true, enqueued: true, asOf: now })
  } catch (error: any) {
    console.error("[cron.leaderboard-refresh] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to enqueue leaderboard refresh",
      },
      { status: 500 },
    )
  }
}
