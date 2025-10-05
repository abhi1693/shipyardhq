import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { sendDiscoverDigestEmails } from "@/lib/server/email/discoverDigest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.discover-digest] run started")
    const result = await sendDiscoverDigestEmails()
    console.info("[cron.discover-digest] run completed", {
      sent: result.sent,
      skipped: result.skipped,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.discover-digest] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
