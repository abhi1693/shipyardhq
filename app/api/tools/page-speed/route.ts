import { NextResponse } from "next/server"
import { z } from "zod"

import { normalizePublicUrl } from "@/lib/server/public-html"
import { consumeToolsRequest } from "@/lib/server/tools-rate-limit"

const BodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
})

type Metric = { percentile?: number; category?: string }
type PsiResponse = {
  error?: { message?: string }
  loadingExperience?: {
    overall_category?: string
    metrics?: Record<string, Metric>
  }
  lighthouseResult?: {
    fetchTime?: string
    finalUrl?: string
    categories?: Record<string, { score?: number }>
    audits?: Record<
      string,
      {
        title?: string
        displayValue?: string
        numericValue?: number
        score?: number | null
        details?: { overallSavingsMs?: number }
      }
    >
  }
}

function fieldMetric(
  metrics: Record<string, Metric> | undefined,
  key: string,
  divisor = 1,
) {
  const metric = metrics?.[key]
  return metric?.percentile === undefined
    ? null
    : {
        value: metric.percentile / divisor,
        category: metric.category?.toLowerCase() ?? "unknown",
      }
}

export async function POST(request: Request) {
  const rate = consumeToolsRequest(request)
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Too many tests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid URL and strategy." },
      { status: 400 },
    )
  let target: URL
  try {
    target = normalizePublicUrl(parsed.data.url)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enter a public URL." },
      { status: 400 },
    )
  }
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  )
  endpoint.searchParams.set("url", target.toString())
  endpoint.searchParams.set("strategy", parsed.data.strategy)
  for (const category of [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
  ])
    endpoint.searchParams.append("category", category)
  if (process.env.GOOGLE_PAGESPEED_API_KEY)
    endpoint.searchParams.set("key", process.env.GOOGLE_PAGESPEED_API_KEY)
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    })
    const data = (await response.json()) as PsiResponse
    if (!response.ok || data.error) {
      const upstreamMessage = data.error?.message ?? ""
      const quotaLimited =
        response.status === 429 || /quota|rate limit/i.test(upstreamMessage)
      return NextResponse.json(
        {
          error: quotaLimited
            ? "The PageSpeed service has reached its current quota. Please try again later."
            : "Google PageSpeed could not analyze this URL. Confirm that the page is public and try again.",
        },
        { status: quotaLimited ? 429 : 502 },
      )
    }
    const lighthouse = data.lighthouseResult
    const audits = lighthouse?.audits ?? {}
    const metrics = data.loadingExperience?.metrics
    const score = (key: string) =>
      Math.round((lighthouse?.categories?.[key]?.score ?? 0) * 100)
    const labMetric = (key: string, divisor = 1) =>
      audits[key]?.numericValue === undefined
        ? null
        : audits[key]!.numericValue! / divisor
    const opportunities = Object.entries(audits)
      .flatMap(([id, audit]) =>
        audit.details?.overallSavingsMs && audit.details.overallSavingsMs > 50
          ? [
              {
                id,
                title: audit.title ?? id,
                displayValue: audit.displayValue ?? "",
                savingsMs: Math.round(audit.details.overallSavingsMs),
              },
            ]
          : [],
      )
      .sort((a, b) => b.savingsMs - a.savingsMs)
      .slice(0, 8)
    return NextResponse.json(
      {
        url: lighthouse?.finalUrl ?? target.toString(),
        strategy: parsed.data.strategy,
        fetchedAt: lighthouse?.fetchTime ?? new Date().toISOString(),
        field: {
          overall:
            data.loadingExperience?.overall_category?.toLowerCase() ?? null,
          lcp: fieldMetric(metrics, "LARGEST_CONTENTFUL_PAINT_MS"),
          inp: fieldMetric(metrics, "INTERACTION_TO_NEXT_PAINT"),
          cls: fieldMetric(metrics, "CUMULATIVE_LAYOUT_SHIFT_SCORE", 100),
        },
        lab: {
          performance: score("performance"),
          accessibility: score("accessibility"),
          bestPractices: score("best-practices"),
          seo: score("seo"),
          lcpMs: labMetric("largest-contentful-paint"),
          cls: labMetric("cumulative-layout-shift"),
          tbtMs: labMetric("total-blocking-time"),
          fcpMs: labMetric("first-contentful-paint"),
          speedIndexMs: labMetric("speed-index"),
        },
        opportunities,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? "The PageSpeed test timed out. Try again shortly."
            : "The PageSpeed service is temporarily unavailable.",
      },
      { status: 502 },
    )
  }
}
