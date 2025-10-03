import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { sendProductReviewDigestEmails } from "@/lib/server/email/productReviewDigest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    const result = await sendProductReviewDigestEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron] product review digest failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
