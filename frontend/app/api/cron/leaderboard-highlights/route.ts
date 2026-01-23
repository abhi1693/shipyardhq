import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import {
  announceLeaderboardPeriodWinners,
  type PeriodCadence,
} from "@/lib/server/leaderboard/winners"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PERIODS: ReadonlyArray<PeriodCadence> = ["day", "week", "month"]

function parsePeriods(periodParam: string | null): PeriodCadence[] {
  if (!periodParam) {
    return ["day", "week"]
  }

  const values = periodParam
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return values.filter((value): value is PeriodCadence =>
    PERIODS.includes(value as PeriodCadence),
  )
}

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const periodParam = url.searchParams.get("period")
  const limitParam = url.searchParams.get("limit")

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const limit =
    typeof parsedLimit === "number" && !Number.isNaN(parsedLimit)
      ? parsedLimit
      : 3

  const periods = parsePeriods(periodParam)
  if (!periods.length) {
    return NextResponse.json(
      { success: false, error: "No valid period provided" },
      { status: 400 },
    )
  }

  try {
    const results = []
    for (const period of periods) {
      const result = await announceLeaderboardPeriodWinners({ period, limit })
      results.push({ period, result })
    }

    return NextResponse.json({
      success: true,
      limit,
      periods,
      results,
    })
  } catch (error: any) {
    console.error("[cron.leaderboard-highlights] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to generate leaderboard highlights",
      },
      { status: 500 },
    )
  }
}
