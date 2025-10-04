import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runBacklinkVerification } from "@/lib/server/rewards/backlinkVerification"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    const result = await runBacklinkVerification()
    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    console.error("[cron] backlink verification failed", error)
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
