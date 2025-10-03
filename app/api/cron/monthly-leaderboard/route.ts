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
    const result = await generateMonthlyLeaderboard({ month, limit })
    revalidateMonthlyLeaderboard(result.monthKey)
    const notification = await notifyMonthlyWinners(result)
    return NextResponse.json({ success: true, notification, result })
  } catch (error: any) {
    console.error("[cron] monthly leaderboard generation failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to generate monthly leaderboard",
      },
      { status: 500 },
    )
  }
}
