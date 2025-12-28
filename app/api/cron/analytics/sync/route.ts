import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { runAnalyticsIngestion } from "@/lib/server/analytics/ingestion"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseNumberParam(value: string | null) {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveJobs(jobParam: string | null) {
  if (!jobParam) return null
  switch (jobParam) {
    case "daily":
      return ["product_traffic_daily"] as const
    case "breakdowns":
      return ["product_traffic_breakdowns"] as const
    case "all":
      return ["product_traffic_daily", "product_traffic_breakdowns"] as const
    default:
      return null
  }
}

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const startDate = url.searchParams.get("start")
  const endDate = url.searchParams.get("end")
  const days = parseNumberParam(url.searchParams.get("days"))
  const maxRows = parseNumberParam(url.searchParams.get("maxRows"))
  const includeBreakdowns =
    url.searchParams.get("breakdowns") === "true"
  const jobs = resolveJobs(url.searchParams.get("job"))

  const result = await runAnalyticsIngestion({
    startDate,
    endDate,
    days,
    jobs: jobs ? [...jobs] : undefined,
    includeBreakdowns,
    maxRows: maxRows ?? undefined,
  })

  return NextResponse.json(result)
}
