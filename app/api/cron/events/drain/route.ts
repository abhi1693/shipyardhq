import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { drainEventQueue } from "@/lib/server/events/drain"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.events-drain] run started")
    const result = await drainEventQueue()
    console.info("[cron.events-drain] run completed", result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("[cron.events-drain] run failed", error)
    const message = error instanceof Error ? error.message : "Failed"
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
