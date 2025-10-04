import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { scheduleStaleProductInsightPipelines } from "@/lib/server/productInsights/pipelineAutoScheduler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DAY_IN_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const limitParam = url.searchParams.get("limit")
  const staleDaysParam = url.searchParams.get("staleDays")

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const staleAfterMs = staleDaysParam
    ? Number.parseInt(staleDaysParam, 10) * DAY_IN_MS
    : undefined

  try {
    const result = await scheduleStaleProductInsightPipelines({
      limit,
      staleAfterMs,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron] product insight refresh scheduler failed", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed" },
      { status: 500 },
    )
  }
}
