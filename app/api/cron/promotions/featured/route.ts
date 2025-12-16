import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runFeaturedPlanPromoCron } from "@/lib/server/promotions/featuredPlanPromo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)

  try {
    console.info("[cron.promotions.featured] run started", {
      dryRun: url.searchParams.get("dryRun") ?? null,
      max: url.searchParams.get("max") ?? null,
      cooldownDays: url.searchParams.get("cooldownDays") ?? null,
      windowDays: url.searchParams.get("windowDays") ?? null,
    })

    const result = await runFeaturedPlanPromoCron({
      searchParams: url.searchParams,
    })

    console.info("[cron.promotions.featured] run completed", {
      success: result.success,
      dryRun: result.dryRun,
      runDay: result.runDay,
      availableSlots: result.slots.available,
      paidFeaturedCustomers: result.slots.paidFeaturedCustomers,
      candidates: result.candidates,
      pendingOffers: result.pendingOffers,
      prepared: result.prepared,
      notified: result.notified,
      skipped: result.skipped,
      reasons: result.reasons,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (error: any) {
    console.error("[cron.promotions.featured] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
