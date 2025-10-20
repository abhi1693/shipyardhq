import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { drainEventQueue } from "@/lib/server/events/drain"
import { DEFAULT_EVENT_QUEUE } from "@/lib/server/events/queues"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.events-drain] default queue run started")
    const result = await drainEventQueue({ queue: DEFAULT_EVENT_QUEUE })
    console.info("[cron.events-drain] default queue run completed", result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("[cron.events-drain] default queue run failed", error)
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
