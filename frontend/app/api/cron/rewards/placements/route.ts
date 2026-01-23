import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runPlacementScheduler } from "@/lib/server/rewards/placementScheduler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function handle(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.rewards.placements] run started")
    const result = await runPlacementScheduler()
    const activatedCount = result.activatedProductIds.length
    const expiredCount = result.expiredProductIds.length
    console.info("[cron.rewards.placements] run completed", {
      activated: result.activated,
      expired: result.expired,
      badgesActivated: result.badgesActivated,
      badgesExpired: result.badgesExpired,
      activatedProductIds: activatedCount
        ? result.activatedProductIds
        : undefined,
      expiredProductIds: expiredCount ? result.expiredProductIds : undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.rewards.placements] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to run placement scheduler",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handle(request)
}
