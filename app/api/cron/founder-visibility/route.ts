import { NextResponse } from "next/server"

import {
  runFounderVisibilityEngagement,
  type FounderVisibilityAudience,
} from "@/lib/server/engagement/founderVisibility"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AUDIENCES: ReadonlyArray<FounderVisibilityAudience> = ["owner", "all"]

function parseAudience(value: string | null): FounderVisibilityAudience {
  const normalized = value?.trim().toLowerCase() ?? ""
  return AUDIENCES.includes(normalized as FounderVisibilityAudience)
    ? (normalized as FounderVisibilityAudience)
    : "owner"
}

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
  const audience = parseAudience(url.searchParams.get("audience"))
  const topN = parseIntParam(url.searchParams.get("topN"))
  const minMove = parseIntParam(url.searchParams.get("minMove"))
  const maxNotifications = parseIntParam(url.searchParams.get("max"))
  const dryRun = parseBoolParam(url.searchParams.get("dryRun"))

  try {
    console.info("[cron.founder-visibility] run started", {
      audience,
      topN,
      minMove,
      maxNotifications,
      dryRun,
    })

    const result = await runFounderVisibilityEngagement({
      audience,
      topN,
      minMove,
      maxNotifications,
      dryRun,
    })

    console.info("[cron.founder-visibility] run completed", {
      audience: result.audience,
      weekKey: result.window.weekKey,
      candidates: result.candidates,
      sent: result.sent,
      skipped: result.skipped,
      reasons: result.reasons,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.founder-visibility] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send founder visibility notifications",
      },
      { status: 500 },
    )
  }
}
