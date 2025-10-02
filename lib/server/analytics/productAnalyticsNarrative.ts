import { z } from "zod"

import { cacheHit, cacheMiss, buildCacheKey } from "@/lib/server/cache"
import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import type {
  ProductAnalyticsNarrative,
  ProductAnalyticsNarrativeConfidence,
  ProductTrafficSummary,
} from "@/types/analytics"

const MODEL = "gpt-4.1-mini"
const CACHE_NAMESPACE = "product-analytics:narrative"
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 // 1 day
const RANGE_TTL_SECONDS: Record<number, number> = {
  7: 60 * 60 * 24, // 1 day
  14: 2 * 60 * 60 * 24, // 2 days
  30: 7 * 60 * 60 * 24, // 7 days
  90: 30 * 60 * 60 * 24, // ~1 month
}

const OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "highlights", "confidence"],
  properties: {
    headline: { type: "string", maxLength: 160 },
    highlights: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string", maxLength: 260 },
    },
    watchouts: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string", maxLength: 260 },
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
  },
} as const

const OutputSchema = z.object({
  headline: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(2).max(4),
  watchouts: z.array(z.string().min(1)).min(1).max(3).optional(),
  confidence: z.enum(["low", "medium", "high"]),
})

type Snapshot = ReturnType<typeof buildSnapshot>

const FALLBACK_CONFIDENCE: ProductAnalyticsNarrativeConfidence = "medium"

function sanitizeReferrerLabel(label?: string | null): string | null {
  if (!label) return null
  const trimmed = label.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower === "none" || lower === "unknown") return null
  if (lower.includes("/")) {
    const [primary] = trimmed.split("/")
    const primaryTrimmed = primary.trim()
    if (!primaryTrimmed) return null
    const primaryLower = primaryTrimmed.toLowerCase()
    if (primaryLower === "none" || primaryLower === "unknown") {
      return null
    }
    return primaryTrimmed
  }
  return trimmed
}

export async function getProductAnalyticsNarrative(
  productId: string,
  productName: string,
  summary: ProductTrafficSummary,
): Promise<ProductAnalyticsNarrative> {
  const cacheKey = buildCacheKey(CACHE_NAMESPACE, productId, summary.rangeDays)
  const cached = await cacheHit<ProductAnalyticsNarrative>({ key: cacheKey })
  if (cached) {
    return cached
  }

  const snapshot = buildSnapshot(summary)
  const fallback = buildFallbackNarrative(productName, summary, snapshot)
  const apiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim())

  let narrative: ProductAnalyticsNarrative = fallback

  if (apiConfigured) {
    try {
      const openai = getOpenAIClient()
      const response = await openai.responses.create({
        model: MODEL,
        temperature: 0.4,
        max_output_tokens: 400,
        text: {
          format: {
            type: "json_schema",
            name: "shipyard_product_analytics_summary",
            schema: OUTPUT_JSON_SCHEMA,
          },
        },
        input: [
          {
            role: "system",
            content:
              "You are an analytics copilot for indie product builders. Analyze the provided metrics and return concise, insight-driven commentary as JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              productName,
              rangeDays: summary.rangeDays,
              snapshot,
              instructions: [
                "Highlight concrete movements, quoting percentages and counts when helpful.",
                "Keep the tone pragmatic and avoid hype.",
                "Use watchouts only for meaningful risks or regressions.",
                "If data volume is low, lower your confidence and mention sensitivity.",
              ],
            }),
          },
        ],
      } as any)

      const raw = extractAssistantJson(response)
      const jsonText = coerceJsonText(raw)

      if (jsonText) {
        try {
          const data = JSON.parse(jsonText)
          const result = OutputSchema.safeParse(data)
          if (result.success) {
            const parsed = result.data
            const highlights = dedupeStrings(parsed.highlights)
            const watchouts = parsed.watchouts
              ? dedupeStrings(parsed.watchouts)
              : undefined

            narrative = {
              source: "ai",
              headline: parsed.headline.trim(),
              highlights,
              watchouts,
              confidence: parsed.confidence,
              generatedAt: new Date().toISOString(),
            }
          }
        } catch (error) {
          console.error(
            "[analytics] Failed to parse AI analytics summary payload",
            error,
          )
        }
      }
    } catch (error) {
      console.error("[analytics] AI analytics summary generation failed", error)
    }
  }

  const ttlSeconds = resolveNarrativeTtl(summary.rangeDays)
  await cacheMiss({
    key: cacheKey,
    value: narrative,
    ttlSeconds,
  })

  return narrative
}

function resolveNarrativeTtl(rangeDays: number): number {
  return RANGE_TTL_SECONDS[rangeDays] ?? DEFAULT_TTL_SECONDS
}

function buildSnapshot(summary: ProductTrafficSummary) {
  const toPercent = (value: number) =>
    Number.isFinite(value) ? Number(value.toFixed(1)) : null
  const toRounded = (value: number) =>
    Number.isFinite(value) ? Math.round(value) : null
  const toSeries = <T extends { date: string }>(
    points: T[],
    pick: (point: T) => Record<string, number>,
  ) => points.slice(-14).map((point) => ({ date: point.date, ...pick(point) }))

  const referrers = summary.referrerBreakdown
    .filter((item) => {
      const views = item.views ?? 0
      if (views <= 0) return false
      const sanitized = sanitizeReferrerLabel(item.referrer)
      if (sanitized) return true
      const raw = item.referrer?.trim()
      return !raw
    })
    .slice(0, 5)
    .map((item) => {
      const sanitized = sanitizeReferrerLabel(item.referrer)
      return {
        label: sanitized ?? "Direct",
        views: item.views,
      }
    })

  const countries = summary.countryBreakdown
    .slice(0, 5)
    .filter((item) => (item.views ?? 0) > 0)
    .map((item) => ({ country: item.country, views: item.views }))

  const deviceBreakdown = summary.deviceBreakdown
    .slice(0, 5)
    .filter((item) => (item.views ?? 0) > 0)
    .map((item) => ({
      device: item.device,
      label: item.label,
      views: item.views,
    }))
  const totalDeviceViews = deviceBreakdown.reduce(
    (acc, item) => acc + (item.views ?? 0),
    0,
  )
  const devices = deviceBreakdown.map((item) => ({
    device: item.device,
    label: item.label,
    views: item.views,
    share:
      totalDeviceViews > 0
        ? Number(((item.views / totalDeviceViews) * 100).toFixed(1))
        : null,
  }))

  const loyaltySource = summary.advanced?.newVsReturning
  const loyalty =
    loyaltySource && loyaltySource.returningVisitors > 0
      ? {
          newVisitors: loyaltySource.newVisitors,
          returningVisitors: loyaltySource.returningVisitors,
          unknownVisitors: loyaltySource.unknownVisitors,
          returningRate: Number((loyaltySource.returningRate * 100).toFixed(1)),
        }
      : null

  const anomalies = summary.advanced?.anomalies?.slice(0, 3).map((anomaly) => ({
    type: anomaly.type,
    description: anomaly.description,
    magnitude: anomaly.magnitude,
    share: anomaly.share ?? null,
  }))

  return {
    totals: {
      totalViews: toRounded(summary.totalViews),
      uniqueVisitors: toRounded(summary.uniqueVisitors),
      clicks: toRounded(summary.clicksInRange),
      upvotes: toRounded(summary.upvotesInRange),
      averageViewsPerDay: Number(summary.averageViewsPerDay.toFixed(1)),
      viewsToday: toRounded(summary.viewsToday),
      viewsSevenDays: toRounded(summary.viewsSevenDays),
    },
    deltas: {
      views: toPercent(summary.totalViewsChange),
      visitors: toPercent(summary.uniqueVisitorsChange),
      clicks: toPercent(summary.clicksChange),
      ctr: toPercent(summary.clickThroughRate),
      ctrChange: toPercent(summary.clickThroughRateChange),
      upvotes: toPercent(summary.upvotesChange),
      upvoteConversion: toPercent(summary.upvoteConversionRate),
      upvoteConversionChange: toPercent(summary.upvoteConversionRateChange),
    },
    leaders: {
      topReferrer:
        summary.topReferrer && (summary.topReferrer.views ?? 0) > 0
          ? (() => {
              const raw = summary.topReferrer?.referrer
              const sanitized = sanitizeReferrerLabel(raw)
              if (sanitized) {
                return { label: sanitized, views: summary.topReferrer.views }
              }
              const rawTrim = raw?.trim()
              if (!rawTrim) {
                return { label: "Direct", views: summary.topReferrer.views }
              }
              return null
            })()
          : null,
      topCountry:
        summary.topCountry && (summary.topCountry.views ?? 0) > 0
          ? {
              country: summary.topCountry.country,
              views: summary.topCountry.views,
            }
          : null,
      referrers,
      countries,
      devices,
    },
    series: {
      views: toSeries(summary.viewsOverTime, (point) => ({
        views: point.views,
        uniqueVisitors: point.uniqueVisitors,
      })),
      engagement: toSeries(summary.engagementOverTime, (point) => ({
        clicks: point.clicks,
        upvotes: point.upvotes,
      })),
    },
    anomalies: anomalies ?? [],
    audience: {
      loyalty,
      devices,
    },
  }
}

function buildFallbackNarrative(
  productName: string,
  summary: ProductTrafficSummary,
  snapshot: Snapshot,
): ProductAnalyticsNarrative {
  const formatter = new Intl.NumberFormat("en-US")
  const percentFormatter = (value: number | null) =>
    value === null ? "flat" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  const rateFormatter = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(1)}%`

  const totalViews = formatter.format(summary.totalViews)
  const viewsDelta = percentFormatter(snapshot.deltas.views)
  const rangeLabel = `${summary.rangeDays}d`

  const clickCount = snapshot.totals.clicks ?? 0
  const ctrLabel = rateFormatter(snapshot.deltas.ctr)
  const clicksDelta = percentFormatter(snapshot.deltas.clicks)

  const topReferrer = snapshot.leaders.topReferrer
  const topCountry = snapshot.leaders.topCountry

  const highlights = dedupeStrings([
    `${productName} saw ${totalViews} views in the last ${rangeLabel} window (${viewsDelta} vs. the prior period).`,
    clickCount
      ? `${formatter.format(clickCount)} CTA clicks at ${ctrLabel} CTR (${clicksDelta} change).`
      : `No CTA clicks recorded during this ${rangeLabel} window yet.`,
    topReferrer && topReferrer.label !== "Direct"
      ? `Top traffic source: ${topReferrer.label} with ${formatter.format(topReferrer.views)} views.`
      : topCountry
        ? `Largest audience came from ${topCountry.country} at ${formatter.format(topCountry.views)} views.`
        : `Traffic is currently distributed without a single dominant referrer.`,
  ])

  const watchouts: string[] = []
  if (snapshot.deltas.views !== null && snapshot.deltas.views < -5) {
    watchouts.push(
      `Views are down ${Math.abs(snapshot.deltas.views).toFixed(1)}% period over period — investigate campaign reach.`,
    )
  }
  if (snapshot.deltas.clicks !== null && snapshot.deltas.clicks < -5) {
    watchouts.push(
      `CTA engagement slipped ${Math.abs(snapshot.deltas.clicks).toFixed(1)}%; revisit call-to-action placement.`,
    )
  }
  if (snapshot.deltas.ctr !== null && snapshot.deltas.ctr < 5) {
    watchouts.push(
      `Current CTR is ${snapshot.deltas.ctr.toFixed(1)}%; test stronger copy or incentives to lift conversions.`,
    )
  }

  const uniqueVisitors = snapshot.totals.uniqueVisitors ?? 0
  let confidence: ProductAnalyticsNarrativeConfidence = FALLBACK_CONFIDENCE
  if (summary.totalViews < 25 || uniqueVisitors < 10) {
    confidence = "low"
  } else if (summary.totalViews > 300 && uniqueVisitors > 120) {
    confidence = "high"
  }

  return {
    source: "fallback",
    headline:
      snapshot.deltas.views !== null && snapshot.deltas.views >= 5
        ? `Traffic trending up (${snapshot.deltas.views.toFixed(1)}%)`
        : snapshot.deltas.views !== null && snapshot.deltas.views <= -5
          ? `Traffic softened (${snapshot.deltas.views.toFixed(1)}%)`
          : `${productName} traffic snapshot`,
    highlights,
    watchouts: watchouts.length ? dedupeStrings(watchouts) : undefined,
    confidence,
    generatedAt: new Date().toISOString(),
  }
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed.length) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}
