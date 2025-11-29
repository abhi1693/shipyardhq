import { NextResponse } from "next/server"

import { revalidateMonthlyLeaderboard } from "@/lib/cache/revalidate"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import {
  getPreviousMonth,
  parseMonthKey,
  normalizeMonth,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"
import { generateLeaderboardRun } from "@/lib/server/leaderboard/v2"
import { announceLeaderboardWinnersForRun } from "@/lib/server/leaderboard/winners"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const monthParam = url.searchParams.get("month") || undefined
  const limitParam = url.searchParams.get("limit") || undefined

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const limit =
    typeof parsedLimit === "number" && !Number.isNaN(parsedLimit)
      ? parsedLimit
      : undefined

  const targetMonth = parseMonthKey(monthParam) ?? getPreviousMonth(new Date())
  const periodStart = normalizeMonth(targetMonth)
  const periodEnd = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1),
  )

  try {
    console.info("[cron.monthly-leaderboard] run started", {
      monthParam,
      limit,
      month: targetMonth?.toISOString(),
    })
    const result = await generateLeaderboardRun({
      periodStart,
      periodEnd,
      asOf: new Date(),
    })
    const monthKey = toMonthKey(periodStart)
    console.info("[cron.monthly-leaderboard] leaderboard generated", {
      monthKey,
      runId: result.runId,
      scores: result.scores,
      windowEnd: result.windowEnd.toISOString(),
    })
    revalidateMonthlyLeaderboard(monthKey, "revalidate")
    const notification = await announceLeaderboardWinnersForRun(result.runId)
    console.info("[cron.monthly-leaderboard] winner notification", {
      monthKey,
      notified: notification.notified,
      alreadyNotified: notification.alreadyNotified,
      recipientCount: notification.recipients.length,
      skipped: notification.skipped,
    })
    return NextResponse.json({ success: true, notification, result })
  } catch (error: any) {
    console.error("[cron.monthly-leaderboard] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to generate monthly leaderboard",
      },
      { status: 500 },
    )
  }
}
