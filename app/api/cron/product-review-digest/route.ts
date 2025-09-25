import { NextResponse } from "next/server"
import { sendProductReviewDigestEmails } from "@/lib/server/email/productReviewDigest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization") || ""
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

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
