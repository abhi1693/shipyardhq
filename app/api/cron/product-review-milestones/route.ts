import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { sendProductReviewMilestoneEmails } from "@/lib/server/email/productReviewMilestone"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function handle(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.product-review-milestones] run started")
    const result = await sendProductReviewMilestoneEmails()
    console.info("[cron.product-review-milestones] run completed", result)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.product-review-milestones] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handle(request)
}
