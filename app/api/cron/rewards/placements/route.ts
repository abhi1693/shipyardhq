import { NextResponse } from "next/server"

import { runPlacementScheduler } from "@/lib/server/rewards/placementScheduler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Fail closed in production if the secret is missing
    return process.env.NODE_ENV !== "production"
  }
  const authHeader = request.headers.get("authorization") || ""
  return authHeader === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
  return POST(request)
}
