import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runStreakMaintenance } from "@/lib/server/rewards/streakMaintenance"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    const summary = await runStreakMaintenance()
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    console.error("[cron] streak maintenance failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
