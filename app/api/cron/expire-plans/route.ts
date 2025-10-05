import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { expireBoostedPlans } from "@/lib/server/planExpiration"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    const result = await expireBoostedPlans()

    if (!result.count) {
      console.info("[cron] expire plans noop")
    } else {
      console.info("[cron] expire plans expired boosts", {
        count: result.count,
        expired: result.expired.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          planName: item.planName,
          boostForDays: item.boostForDays,
        })),
      })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error("[cron] expire plans failed", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Failed" },
      { status: 500 },
    )
  }
}
