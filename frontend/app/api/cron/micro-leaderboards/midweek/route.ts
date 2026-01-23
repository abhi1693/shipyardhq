import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runMicroLeaderboardEngagement } from "@/lib/server/engagement/microLeaderboards"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseBoolParam(value: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const rankMin = parseIntParam(url.searchParams.get("rankMin"))
  const rankMax = parseIntParam(url.searchParams.get("rankMax"))
  const max = parseIntParam(url.searchParams.get("max"))
  const dryRun = parseBoolParam(url.searchParams.get("dryRun"))

  try {
    console.info("[cron.micro-leaderboards.midweek] run started", {
      rankMin,
      rankMax,
      max,
      dryRun,
    })

    const result = await runMicroLeaderboardEngagement({
      mode: "midweek",
      rankMin,
      rankMax,
      maxNotifications: max,
      dryRun,
    })

    console.info("[cron.micro-leaderboards.midweek] run completed", {
      weekKey: result.weekKey,
      candidates: result.candidates,
      sent: result.sent,
      skipped: result.skipped,
      reasons: result.reasons,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.micro-leaderboards.midweek] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send micro leaderboard nudges",
      },
      { status: 500 },
    )
  }
}
