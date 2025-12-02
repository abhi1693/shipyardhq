import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { sendWeeklyNewsletterEmails } from "@/lib/server/email/weeklyNewsletter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.weekly-newsletter] run started")
    const result = await sendWeeklyNewsletterEmails()
    console.info("[cron.weekly-newsletter] run completed", {
      sent: result.sent,
      skipped: result.skipped,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.weekly-newsletter] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
