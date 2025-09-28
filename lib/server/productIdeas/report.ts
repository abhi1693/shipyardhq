import { jsonrepair } from "jsonrepair"
import { z } from "zod"

import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import type {
  ProductIdeaComprehensiveReport,
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
  ProductIdeaReportActionPriority,
  ProductIdeaReportActionTimeframe,
  ProductIdeaSubreddit,
} from "@/types/product-ideas"

import type {
  ProductIdeaProductContext,
  ProductIdeaSummary,
} from "./types"

const MODEL = "gpt-4.1-mini"
const MAX_SUBREDDITS = 6
const MAX_THREADS = 9
const MAX_EVIDENCE_PER_ITEM = 3
const MAX_SECTION_ITEMS = 4
const MAX_STRING_LENGTH = 360

const PrioritySchema = z.enum(["high", "medium", "low", "watch"])
const TimeframeSchema = z.enum(["immediate", "near-term", "long-term"])

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
        title: z.string().min(1),
        description: z.string().min(1),
        priority: PrioritySchema,
        timeframe: z
          .union([TimeframeSchema, z.null()])
          .optional()
          .nullable(),
        rationale: z.string().optional().nullable(),
        successMetric: z.string().optional().nullable(),
        supportingSignals: z
          .array(z.string().min(1))
          .min(1)
          .max(4)
          .optional()
          .nullable(),
      }),
    )
    .min(2)
    .max(6),
  communityPlan: z
    .array(
      z.object({
        objective: z.string().min(1),
        targetSubreddits: z
          .array(z.string().min(2))
          .min(1)
          .max(MAX_SUBREDDITS),
        tactics: z.array(z.string().min(1)).min(1).max(5),
        successSignal: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  metricsToWatch: z.array(z.string().min(1)).min(1).max(6).optional().nullable(),
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
  subreddits?: ProductIdeaSubreddit[] | null,
): Array<
  Pick<
    ProductIdeaSubreddit,
    "name" | "title" | "description" | "primaryTopic" | "relevanceScore"
  > & {
    subscribers?: number | null
    matchedQueries?: string[] | null
  }
> {
  if (!Array.isArray(subreddits)) return []
  return subreddits
    .slice(0, MAX_SUBREDDITS)
    .map((entry) => ({
      name: entry.name,
      title: truncate(entry.title),
      description: truncate(entry.description, 420),
      primaryTopic: truncate(entry.primaryTopic, 120),
      relevanceScore: entry.relevanceScore ?? null,
      subscribers: entry.subscribers ?? null,
      matchedQueries: entry.matchedQueries?.slice(0, 3) ?? null,
    }))
}

function sanitizeInsights(
  insights?: ProductIdeaRedditInsightReport | null,
) {
  if (!insights) return null
  return {
    summary: truncate(insights.summary, 640),
    recommendedFocus: insights.recommendedFocus?.slice(0, 5) ?? null,
    sections: insights.sections.slice(0, 3).map((section) => ({
      title: section.title,
      description: truncate(section.description, 360),
      items: section.items.slice(0, MAX_SECTION_ITEMS).map((item) => ({
        insight: truncate(item.insight, 320),
        sentiment: item.sentiment ?? null,
        audience: truncate(item.audience, 160),
        evidence: item.evidence?.slice(0, MAX_EVIDENCE_PER_ITEM) ?? null,
      })),
    })),
  }
}

function sanitizeThreads(
  threads?: ProductIdeaRedditThread[] | null,
) {
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
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  summaryText: string | null
  subreddits: ReturnType<typeof sanitizeSubreddits>
  redditInsights: ReturnType<typeof sanitizeInsights>
  redditThreads: ReturnType<typeof sanitizeThreads>
  existingCapabilities?: string[]
}

type CreateReportInput = {
  productId: string
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  summaryText?: string | null
  subreddits?: ProductIdeaSubreddit[] | null
  insights?: ProductIdeaRedditInsightReport | null
  threads?: ProductIdeaRedditThread[] | null
}

type CreateReportResult = {
  report: ProductIdeaComprehensiveReport
  model: string
}

export async function createProductIdeaComprehensiveReport(
  input: CreateReportInput,
): Promise<CreateReportResult> {
  const { productId, product, summary, summaryText, subreddits, insights, threads } =
    input

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

  console.info("[productIdeas:report] generating comprehensive report", {
    productId,
    subredditCount: payload.subreddits.length,
    insightSections: payload.redditInsights?.sections?.length ?? 0,
    threadCount: payload.redditThreads.length,
  })

  const response = await openai.responses.create({
    model: MODEL,
    temperature: 0.2,
    max_output_tokens: 1100,
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
                properties: {
                  title: { type: "string", minLength: 4 },
                  description: { type: "string", minLength: 12 },
                  priority: {
                    type: "string",
                    enum: ["high", "medium", "low", "watch"],
                  },
                  timeframe: {
                    type: ["string", "null"],
                    enum: ["immediate", "near-term", "long-term", null],
                  },
                  rationale: {
                    anyOf: [
                      { type: "string", minLength: 10 },
                      { type: "null" },
                    ],
                  },
                  successMetric: {
                    anyOf: [
                      { type: "string", minLength: 6 },
                      { type: "null" },
                    ],
                  },
                  supportingSignals: {
                    anyOf: [
                      {
                        type: "array",
                        items: { type: "string", minLength: 6 },
                        minItems: 1,
                        maxItems: 4,
                      },
                      { type: "null" },
                    ],
                  },
                },
                required: [
                  "title",
                  "description",
                  "priority",
                  "timeframe",
                  "rationale",
                  "successMetric",
                  "supportingSignals",
                ],
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
                    anyOf: [
                      { type: "string", minLength: 6 },
                      { type: "null" },
                    ],
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
  const jsonText = coerceJsonText(raw)
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(jsonText || "{}")
  } catch (error) {
    console.warn("[productIdeas:report] primary JSON.parse failed, attempting repair", {
      productId,
      error,
    })
    parsedJson = JSON.parse(jsonrepair(jsonText || "{}"))
  }

  const parsed = ReportSchema.parse(parsedJson)

  const report: ProductIdeaComprehensiveReport = {
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
    recommendedActions: parsed.recommendedActions.map((action) => ({
      title: action.title.trim(),
      description: action.description.trim(),
      priority: action.priority as ProductIdeaReportActionPriority,
      timeframe: ((action.timeframe ?? undefined) as ProductIdeaReportActionTimeframe | undefined) ?? null,
      rationale: action.rationale?.trim() ?? null,
      successMetric: action.successMetric?.trim() ?? null,
      supportingSignals: action.supportingSignals?.map((signal) =>
        signal.trim(),
      ) ?? null,
    })),
    communityPlan: parsed.communityPlan
      ?.map((plan) => ({
        objective: plan.objective.trim(),
        targetSubreddits: plan.targetSubreddits.map((entry) => entry.trim()),
        tactics: plan.tactics.map((entry) => entry.trim()),
        successSignal: plan.successSignal?.trim() ?? null,
      }))
      .filter((plan) => plan.targetSubreddits.length > 0) ?? null,
    metricsToWatch: parsed.metricsToWatch?.map((metric) => metric.trim()) ?? null,
    supportingData: parsed.supportingData
      ?.map((entry) => ({
        label: entry.label.trim(),
        entries: entry.entries.map((item) => item.trim()),
      }))
      .filter((entry) => entry.entries.length > 0) ?? null,
  }

  console.info("[productIdeas:report] report synthesized", {
    productId,
    highlightCount: report.headlineHighlights.length,
    actionCount: report.recommendedActions.length,
  })

  return {
    report,
    model: MODEL,
  }
}
