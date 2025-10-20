import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runProductLaunchBackfill } from "@/lib/server/rewards/productLaunchBackfill"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.rewards.launch-backfill] start")
    await runProductLaunchBackfill()
    console.info("[cron.rewards.launch-backfill] complete")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[cron.rewards.launch-backfill] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
