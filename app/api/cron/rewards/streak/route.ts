import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runStreakMaintenance } from "@/lib/server/rewards/streakMaintenance"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function handle(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info("[cron.rewards.streak] run started")
    const summary = await runStreakMaintenance()
    console.info("[cron.rewards.streak] run completed", {
      evaluatedDay: summary.evaluatedDay,
      qualifyingUsers: summary.qualifyingUsers,
      streaksExtended: summary.streaksExtended,
      streaksReset: summary.streaksReset,
      awardsCreated: summary.awardsCreated,
      alreadyEvaluated: summary.alreadyEvaluated,
      failureCount: summary.failures.length,
      tiersAwarded: summary.tiersAwarded,
      triggerRuleTotals: summary.triggerRuleTotals,
    })
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    console.error("[cron.rewards.streak] run failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handle(request)
}
