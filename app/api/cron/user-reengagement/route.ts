import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { sendUserReengagementEmails } from "@/lib/server/email/userReengagement"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.user-reengagement] run started")
    const result = await sendUserReengagementEmails()
    console.info("[cron.user-reengagement] run completed", result)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.user-reengagement] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
