import { jsonrepair } from "jsonrepair"
import { z } from "zod"

import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import type {
  ProductInsightComprehensiveReport,
  ProductInsightRedditInsightReport,
  ProductInsightRedditThread,
  ProductInsightReportAction,
  ProductInsightReportActionPriority,
  ProductInsightReportActionTimeframe,
  ProductInsightSubreddit,
} from "@/types/product-insights"

import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "./types"

const MODEL = "gpt-4.1-mini"
const MAX_SUBREDDITS = 6
const MAX_THREADS = 9
const MAX_EVIDENCE_PER_ITEM = 3
const MAX_SECTION_ITEMS = 4
const MAX_STRING_LENGTH = 360

const RECOMMENDED_ACTION_PROPERTIES = {
  title: { type: "string", minLength: 4 },
  description: { type: "string", minLength: 8 },
  priority: {
    type: "string",
    enum: ["high", "medium", "low", "watch"],
    default: "watch",
  },
  timeframe: {
    type: "string",
    enum: ["immediate", "near-term", "long-term", "unspecified"],
    default: "unspecified",
  },
  rationale: { type: "string", minLength: 0, default: "" },
  successMetric: { type: "string", minLength: 0, default: "" },
  supportingSignals: {
    type: "array",
    items: { type: "string", minLength: 4 },
    minItems: 0,
    maxItems: 4,
    default: [],
  },
} as const

const RECOMMENDED_ACTION_REQUIRED = Object.keys(RECOMMENDED_ACTION_PROPERTIES)

function asTrimmedString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const str = String(value).trim()
    return str.length ? str : null
  }
  return null
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const result = value
    .map((entry) => asTrimmedString(entry))
    .filter((entry): entry is string => Boolean(entry))
  return result.length ? result : null
}

function normalizePriority(value: unknown): ProductInsightReportActionPriority {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (
      normalized === "high" ||
      normalized === "medium" ||
      normalized === "low"
    ) {
      return normalized
    }
    if (normalized === "monitor" || normalized === "watch") {
      return "watch"
    }
  }
  return "watch"
}

function normalizeTimeframe(
  value: unknown,
): ProductInsightReportActionTimeframe | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "immediate") return "immediate"
  if (
    normalized === "near-term" ||
    normalized === "near term" ||
    normalized === "soon"
  ) {
    return "near-term"
  }
  if (
    normalized === "long-term" ||
    normalized === "long term" ||
    normalized === "later"
  ) {
    return "long-term"
  }
  if (normalized === "unspecified") {
    return null
  }
  return null
}

const ReportSchema = z.object({
  executiveSummary: z.string().min(1),
  headlineHighlights: z.array(z.string().min(1)).min(2).max(6),
  opportunityAreas: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.string().min(1).optional().nullable(),
        highlights: z.array(z.string().min(1)).min(1).max(5),
      }),
    )
    .min(1)
    .max(4),
  customerSignals: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.string().min(1).optional().nullable(),
        highlights: z.array(z.string().min(1)).min(1).max(5),
      }),
    )
    .min(1)
    .max(4),
  recommendedActions: z
    .array(
      z.object({
        title: z.union([z.string(), z.number()]),
        description: z.union([z.string(), z.number(), z.null()]).optional(),
        priority: z.union([z.string(), z.number(), z.null()]).optional(),
        timeframe: z.union([z.string(), z.number(), z.null()]).optional(),
        rationale: z.union([z.string(), z.number(), z.null()]).optional(),
        successMetric: z.union([z.string(), z.number(), z.null()]).optional(),
        supportingSignals: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .nullable(),
      }),
    )
    .max(6)
    .optional()
    .default([]),
  communityPlan: z
    .array(
      z.object({
        objective: z.string().min(1),
        targetSubreddits: z.array(z.string().min(2)).min(1).max(MAX_SUBREDDITS),
        tactics: z.array(z.string().min(1)).min(1).max(5),
        successSignal: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  metricsToWatch: z
    .array(z.string().min(1))
    .min(1)
    .max(6)
    .optional()
    .nullable(),
  supportingData: z
    .array(
      z.object({
        label: z.string().min(1),
        entries: z.array(z.string().min(1)).min(1).max(6),
      }),
    )
    .optional()
    .nullable(),
})

function truncate(value: string | null | undefined, max = MAX_STRING_LENGTH) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`
}

function sanitizeSubreddits(
  subreddits?: ProductInsightSubreddit[] | null,
): Array<
  Pick<
    ProductInsightSubreddit,
    "name" | "title" | "description" | "primaryTopic" | "relevanceScore"
  > & {
    subscribers?: number | null
    matchedQueries?: string[] | null
  }
> {
  if (!Array.isArray(subreddits)) return []
  return subreddits.slice(0, MAX_SUBREDDITS).map((entry) => ({
    name: entry.name,
    title: truncate(entry.title),
    description: truncate(entry.description, 420),
    primaryTopic: truncate(entry.primaryTopic, 120),
    relevanceScore: entry.relevanceScore ?? null,
    subscribers: entry.subscribers ?? null,
    matchedQueries: entry.matchedQueries?.slice(0, 3) ?? null,
  }))
}

function sanitizeInsights(insights?: ProductInsightRedditInsightReport | null) {
  if (!insights) return null
  const sections = Array.isArray(insights.sections)
    ? insights.sections.slice(0, 3)
    : []
  return {
    summary: truncate(insights.summary, 640),
    recommendedFocus: insights.recommendedFocus?.slice(0, 5) ?? null,
    sections: sections.map((section) => ({
      title: section.title,
      description: truncate(section.description, 360),
      items: Array.isArray(section.items)
        ? section.items.slice(0, MAX_SECTION_ITEMS).map((item) => ({
            insight: truncate(item.insight, 320),
            sentiment: item.sentiment ?? null,
            audience: truncate(item.audience, 160),
            evidence: item.evidence?.slice(0, MAX_EVIDENCE_PER_ITEM) ?? null,
          }))
        : [],
    })),
  }
}

function sanitizeThreads(threads?: ProductInsightRedditThread[] | null) {
  if (!Array.isArray(threads)) return []
  return threads.slice(0, MAX_THREADS).map((thread) => ({
    title: truncate(thread.title, 260),
    subreddit: thread.subreddit,
    score: thread.score ?? null,
    numComments: thread.numComments ?? null,
    matchedQueries: thread.matchedQueries?.slice(0, 3) ?? null,
    topComment: thread.topComments?.[0]
      ? truncate(thread.topComments[0]!.body, 420)
      : null,
  }))
}

type ReportPayload = {
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  summaryText: string | null
  subreddits: ReturnType<typeof sanitizeSubreddits>
  redditInsights: ReturnType<typeof sanitizeInsights>
  redditThreads: ReturnType<typeof sanitizeThreads>
  existingCapabilities?: string[]
}

type CreateReportInput = {
  productId: string
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  summaryText?: string | null
  subreddits?: ProductInsightSubreddit[] | null
  insights?: ProductInsightRedditInsightReport | null
  threads?: ProductInsightRedditThread[] | null
}

type CreateReportResult = {
  report: ProductInsightComprehensiveReport
  model: string
}

export async function createProductInsightComprehensiveReport(
  input: CreateReportInput,
): Promise<CreateReportResult> {
  const {
    productId,
    product,
    summary,
    summaryText,
    subreddits,
    insights,
    threads,
  } = input

  const openai = getOpenAIClient()

  const payload: ReportPayload = {
    product,
    summary,
    summaryText: truncate(summaryText, 1200),
    subreddits: sanitizeSubreddits(subreddits),
    redditInsights: sanitizeInsights(insights),
    redditThreads: sanitizeThreads(threads),
  }

  if (summary?.keyFeatures?.length) {
    payload.existingCapabilities = summary.keyFeatures
  }

  console.info("[productInsights:report] generating comprehensive report", {
    productId,
    subredditCount: payload.subreddits.length,
    insightSections: payload.redditInsights?.sections?.length ?? 0,
    threadCount: payload.redditThreads.length,
  })

  const response = await openai.responses.create({
    model: MODEL,
    temperature: 0.2,
    max_output_tokens: 1600,
    text: {
      format: {
        type: "json_schema",
        name: "product_comprehensive_report",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            executiveSummary: { type: "string", minLength: 20 },
            headlineHighlights: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: { type: "string", minLength: 6 },
            },
            opportunityAreas: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string", minLength: 4 },
                  summary: { type: ["string", "null"] },
                  highlights: {
                    type: "array",
                    minItems: 1,
                    maxItems: 5,
                    items: { type: "string", minLength: 6 },
                  },
                },
                required: ["title", "summary", "highlights"],
              },
            },
            customerSignals: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string", minLength: 4 },
                  summary: { type: ["string", "null"] },
                  highlights: {
                    type: "array",
                    minItems: 1,
                    maxItems: 5,
                    items: { type: "string", minLength: 6 },
                  },
                },
                required: ["title", "summary", "highlights"],
              },
            },
            recommendedActions: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: RECOMMENDED_ACTION_PROPERTIES,
                required: RECOMMENDED_ACTION_REQUIRED,
              },
            },
            communityPlan: {
              type: ["array", "null"],
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  objective: { type: "string", minLength: 6 },
                  targetSubreddits: {
                    type: "array",
                    minItems: 1,
                    maxItems: MAX_SUBREDDITS,
                    items: { type: "string", minLength: 2 },
                  },
                  tactics: {
                    type: "array",
                    minItems: 1,
                    maxItems: 5,
                    items: { type: "string", minLength: 6 },
                  },
                  successSignal: {
                    anyOf: [{ type: "string", minLength: 6 }, { type: "null" }],
                  },
                },
                required: [
                  "objective",
                  "targetSubreddits",
                  "tactics",
                  "successSignal",
                ],
              },
            },
            metricsToWatch: {
              type: ["array", "null"],
              items: { type: "string", minLength: 6 },
              minItems: 1,
              maxItems: 6,
            },
            supportingData: {
              type: ["array", "null"],
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string", minLength: 4 },
                  entries: {
                    type: "array",
                    minItems: 1,
                    maxItems: 6,
                    items: { type: "string", minLength: 6 },
                  },
                },
                required: ["label", "entries"],
              },
            },
          },
          required: [
            "executiveSummary",
            "headlineHighlights",
            "opportunityAreas",
            "customerSignals",
            "recommendedActions",
            "communityPlan",
            "metricsToWatch",
            "supportingData",
          ],
        },
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are a product strategy analyst. Combine the provided product narrative, subreddit intelligence, and discussion insights into a concise, data-backed growth report. Respond with JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          objective:
            "Build a comprehensive product improvement report that highlights strategic focus areas informed by Reddit audiences.",
          guidance: [
            "Reference specific subreddits and discussion signals when recommending actions.",
            "Highlight what is working, what is not, and where to double down.",
            "Tie customer signals back to the product's value propositions or pain points.",
            "Favor actionable, near-term recommendations over generic advice.",
            "Only use information provided; do not invent metrics or communities.",
            "Avoid repeating existing capabilities verbatim—frame recommendations as enhancements, fixes, or new bets that address uncovered gaps.",
            "Call out pain points and friction surfaced in Reddit data and translate them into prioritized opportunity areas.",
          ],
          dataset: payload,
        }),
      },
    ],
  } as any)

  const raw = extractAssistantJson(response)
  const jsonText = coerceJsonText(raw) || "{}"

  const sanitizedText = jsonText
    .replace(/,(?=\s*[}\]])/g, "")
    .replace(/\uFEFF/g, "")

  const parseCandidates = [jsonText]
  if (sanitizedText !== jsonText) {
    parseCandidates.push(sanitizedText)
  }

  const parseAttempts: Array<{
    phase: "primary" | "sanitized" | "repair"
    success: boolean
    error?: unknown
  }> = []
  let parsedJson: unknown | undefined

  for (const [index, candidate] of parseCandidates.entries()) {
    try {
      parsedJson = JSON.parse(candidate)
      parseAttempts.push({
        phase: index === 0 ? "primary" : "sanitized",
        success: true,
      })
      break
    } catch (error) {
      parseAttempts.push({
        phase: index === 0 ? "primary" : "sanitized",
        success: false,
        error,
      })
    }
  }

  if (typeof parsedJson === "undefined") {
    for (const candidate of parseCandidates) {
      try {
        const repaired = jsonrepair(candidate)
        parsedJson = JSON.parse(repaired)
        parseAttempts.push({ phase: "repair", success: true })
        break
      } catch (error) {
        parseAttempts.push({ phase: "repair", success: false, error })
      }
    }
  }

  if (typeof parsedJson === "undefined") {
    console.error("[productInsights:report] failed to parse report JSON", {
      productId,
      attempts: parseAttempts.map(({ phase, success, error }) => ({
        phase,
        success,
        error: error ? `${error}` : undefined,
      })),
      preview: jsonText.slice(0, 2000),
    })
    throw new Error("failed to parse comprehensive report output")
  }

  const hadRepair = parseAttempts.some(
    ({ phase, success }) => phase === "repair" && success,
  )
  const hadFailures = parseAttempts.some(({ success }) => !success)

  if (hadFailures && !hadRepair) {
    console.warn(
      "[productInsights:report] primary JSON.parse failed, sanitized succeeded",
      {
        productId,
        attempts: parseAttempts.map(({ phase, success, error }) => ({
          phase,
          success,
          error: error ? `${error}` : undefined,
        })),
      },
    )
  } else if (hadRepair) {
    console.warn(
      "[productInsights:report] primary JSON.parse failed, repair applied",
      {
        productId,
        attempts: parseAttempts.map(({ phase, success, error }) => ({
          phase,
          success,
          error: error ? `${error}` : undefined,
        })),
      },
    )
  }

  const parsed = ReportSchema.parse(parsedJson)

  const recommendedActions: ProductInsightReportAction[] = []
  for (const action of parsed.recommendedActions ?? []) {
    const title = asTrimmedString(action.title)
    const description = asTrimmedString(action.description)
    if (!title || !description) {
      continue
    }

    const rationale = asTrimmedString(action.rationale)
    const successMetric = asTrimmedString(action.successMetric)
    const supportingSignals = asStringArray(action.supportingSignals)?.slice(
      0,
      4,
    )

    const normalizedSignals =
      supportingSignals
        ?.map((signal) => truncate(signal, 240))
        .filter((entry): entry is string => Boolean(entry)) ?? null

    recommendedActions.push({
      title: truncate(title, 160) ?? title,
      description: truncate(description, 360) ?? description,
      priority: normalizePriority(action.priority),
      timeframe: normalizeTimeframe(action.timeframe),
      rationale: truncate(rationale, 360),
      successMetric: truncate(successMetric, 220),
      supportingSignals: normalizedSignals,
    })
  }

  const report: ProductInsightComprehensiveReport = {
    executiveSummary: parsed.executiveSummary.trim(),
    headlineHighlights: parsed.headlineHighlights.map((item) => item.trim()),
    opportunityAreas: parsed.opportunityAreas.map((area) => ({
      title: area.title.trim(),
      summary: area.summary?.trim() ?? null,
      highlights: area.highlights.map((highlight) => highlight.trim()),
    })),
    customerSignals: parsed.customerSignals.map((section) => ({
      title: section.title.trim(),
      summary: section.summary?.trim() ?? null,
      highlights: section.highlights.map((item) => item.trim()),
    })),
    recommendedActions,
    communityPlan:
      parsed.communityPlan
        ?.map((plan) => ({
          objective: plan.objective.trim(),
          targetSubreddits: plan.targetSubreddits.map((entry) => entry.trim()),
          tactics: plan.tactics.map((entry) => entry.trim()),
          successSignal: plan.successSignal?.trim() ?? null,
        }))
        .filter((plan) => plan.targetSubreddits.length > 0) ?? null,
    metricsToWatch:
      parsed.metricsToWatch?.map((metric) => metric.trim()) ?? null,
    supportingData:
      parsed.supportingData
        ?.map((entry) => ({
          label: entry.label.trim(),
          entries: entry.entries.map((item) => item.trim()),
        }))
        .filter((entry) => entry.entries.length > 0) ?? null,
  }

  console.info("[productInsights:report] report synthesized", {
    productId,
    highlightCount: report.headlineHighlights.length,
    actionCount: report.recommendedActions.length,
  })

  return {
    report,
    model: MODEL,
  }
}
