import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { sendDiscoverDigestEmails } from "@/lib/server/email/discoverDigest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    const result = await sendDiscoverDigestEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron] discover digest failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
