import { NextResponse } from "next/server"

import { revalidateMonthlyLeaderboard } from "@/lib/cache/revalidate"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import {
  generateMonthlyLeaderboard,
  notifyMonthlyWinners,
  parseMonthKey,
} from "@/lib/server/monthlyLeaderboard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const monthParam = url.searchParams.get("month") || undefined
  const limitParam = url.searchParams.get("limit") || undefined

  const month = parseMonthKey(monthParam) ?? undefined
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const limit =
    typeof parsedLimit === "number" && !Number.isNaN(parsedLimit)
      ? parsedLimit
      : undefined

  try {
    console.info("[cron.monthly-leaderboard] run started", {
      monthParam,
      limit,
      month: month?.toISOString(),
    })
    const result = await generateMonthlyLeaderboard({ month, limit })
    console.info("[cron.monthly-leaderboard] leaderboard generated", {
      monthKey: result.monthKey,
      rankings: result.rankings.length,
      persistedCount: result.count,
    })
    revalidateMonthlyLeaderboard(result.monthKey, "revalidate")
    const notification = await notifyMonthlyWinners(result)
    console.info("[cron.monthly-leaderboard] winner notification", {
      monthKey: result.monthKey,
      notified: notification.notified,
      alreadyNotified: notification.alreadyNotified,
      recipientCount: notification.recipients.length,
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
