import { z } from "zod"

import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import type {
  ProductInsightCompetitor,
  ProductInsightCompetitorStageData,
} from "@/types/product-insights"

import {
  getProductInsightCompetitorModel,
} from "./config"
import type {
  ProductInsightProductContext,
  ProductInsightSummary,
  ProductInsightSnapshotStageData,
} from "./types"

const MAX_COMPETITORS = 8
const MAX_NOTE_LENGTH = 320

const CompetitorSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  focusArea: z.string().optional().nullable(),
  differentiators: z.array(z.string()).optional().nullable(),
  positioning: z.string().optional().nullable(),
  maturity: z.enum(["emerging", "established", "enterprise"]).optional().nullable(),
  strengths: z.array(z.string()).optional().nullable(),
  weaknesses: z.array(z.string()).optional().nullable(),
  source: z.string().optional().nullable(),
  similarityScore: z.number().min(0).max(1).optional().nullable(),
})

const CompetitorResponseSchema = z.object({
  competitors: z.array(CompetitorSchema).min(3).max(MAX_COMPETITORS),
  researchNotes: z.array(z.string()).optional().nullable(),
  model: z.string().optional().nullable(),
})

function sanitizeText(value?: string | null, maxLength = 280) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`
}

function sanitizeStringList(values?: string[] | null, maxLength = 6) {
  if (!Array.isArray(values) || !values.length) return null
  const result = Array.from(
    new Set(
      values
        .map((entry) => sanitizeText(entry, 160))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  )
  if (!result.length) return null
  return result.slice(0, maxLength)
}

function sanitizeUrl(value?: string | null, maxLength = 320) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/\s+/g, "")
  if (!normalized) return null
  return normalized.length > maxLength
    ? normalized.slice(0, Math.max(0, maxLength))
    : normalized
}

function normalizeMaturity(value?: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized.startsWith("emerg")) return "emerging"
  if (normalized.startsWith("estab")) return "established"
  if (normalized.startsWith("enter")) return "enterprise"
  return null
}

function sanitizeCompetitor(
  entry: z.infer<typeof CompetitorSchema>,
): ProductInsightCompetitor {
  return {
    name: entry.name.trim(),
    description: sanitizeText(entry.description, 240),
    url: sanitizeUrl(entry.url),
    focusArea: sanitizeText(entry.focusArea, 160),
    differentiators: sanitizeStringList(entry.differentiators),
    positioning: sanitizeText(entry.positioning, 200),
    maturity: normalizeMaturity(entry.maturity ?? null),
    strengths: sanitizeStringList(entry.strengths),
    weaknesses: sanitizeStringList(entry.weaknesses),
    source: sanitizeText(entry.source, 200),
    similarityScore:
      typeof entry.similarityScore === "number"
        ? Number(Math.min(Math.max(entry.similarityScore, 0), 1))
        : null,
  }
}

export type DiscoverProductCompetitorsInput = {
  productId: string
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  snapshot?: ProductInsightSnapshotStageData | null
}

export type DiscoverProductCompetitorsResult = {
  competitors: ProductInsightCompetitor[]
  researchNotes: string[] | null
  model: string
}

function buildModelPayload(input: DiscoverProductCompetitorsInput) {
  const { product, summary, snapshot } = input

  const payload: Record<string, unknown> = {
    objective:
      "Identify the closest real competitors or substitutes a buyer would compare against this product. Focus on products with overlapping capabilities or that surface in evaluation checklists.",
    instructions: [
      "Prioritize SaaS products or workflows that solve the same job-to-be-done.",
      "Include a mix of direct competitors (feature overlap) and near alternatives (substitutes or adjacent products).",
      "Capture what users perceive as the rival's hook, strengths, and any obvious weaknesses.",
      "Favor vendors that appear in recent launch write-ups, comparison threads, or review sites.",
      "Return at least three competitors that a prospective buyer would realistically pit against this product.",
      "Always include every output field even when information is missing by returning null or an empty list as appropriate.",
    ],
    productHooks: {
      name: product.name,
      tagline: product.tagline,
      type: product.type,
      pricingModel: product.pricingModel,
      keywords: product.keywords,
      platforms: product.platforms,
    },
    productDetails: product,
  }

  if (summary) {
    payload.summary = summary
    payload.summaryHighlights = {
      valuePropositions: summary.valuePropositions,
      keyFeatures: summary.keyFeatures,
      painPointsAddressed: summary.painPointsAddressed,
      targetUsers: summary.targetUsers,
    }
  }

  if (snapshot?.pages?.length) {
    payload.websiteSignals = snapshot.pages.slice(0, 5).map((page) => ({
      url: page.url,
      title: sanitizeText(page.title, 120),
      description: sanitizeText(page.metaDescription, 200),
      headings: page.headings?.slice(0, 4),
    }))
  }

  return payload
}

export async function discoverProductCompetitors(
  input: DiscoverProductCompetitorsInput,
): Promise<DiscoverProductCompetitorsResult> {
  const { productId } = input
  const openai = getOpenAIClient()
  const model = getProductInsightCompetitorModel()

  console.info("[productInsights:competitors] generating competitor landscape", {
    productId,
    model,
  })

  const response = await openai.responses.create({
    model,
    temperature: 0.2,
    max_output_tokens: 900,
    text: {
      format: {
        type: "json_schema",
        name: "product_competitor_landscape",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            competitors: {
              type: "array",
              minItems: 3,
              maxItems: MAX_COMPETITORS,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string", minLength: 2 },
                  description: { type: ["string", "null"] },
                  url: { type: ["string", "null"] },
                  focusArea: { type: ["string", "null"] },
                  differentiators: {
                    type: ["array", "null"],
                    items: { type: "string", minLength: 2 },
                    minItems: 1,
                    maxItems: 6,
                  },
                  positioning: { type: ["string", "null"] },
                  maturity: {
                    type: ["string", "null"],
                    enum: ["emerging", "established", "enterprise", null],
                  },
                  strengths: {
                    type: ["array", "null"],
                    items: { type: "string", minLength: 2 },
                    minItems: 1,
                    maxItems: 6,
                  },
                  weaknesses: {
                    type: ["array", "null"],
                    items: { type: "string", minLength: 2 },
                    minItems: 1,
                    maxItems: 6,
                  },
                  source: { type: ["string", "null"] },
                  similarityScore: { type: ["number", "null"], minimum: 0, maximum: 1 },
                },
                required: [
                  "name",
                  "description",
                  "url",
                  "focusArea",
                  "differentiators",
                  "positioning",
                  "maturity",
                  "strengths",
                  "weaknesses",
                  "source",
                  "similarityScore",
                ],
              },
            },
            researchNotes: {
              type: ["array", "null"],
              items: { type: "string", minLength: 4 },
              minItems: 0,
              maxItems: 6,
            },
            model: { type: ["string", "null"] },
          },
          required: ["competitors", "researchNotes", "model"],
        },
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are a market intelligence analyst identifying the closest competitors for a SaaS product. Return JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify(buildModelPayload(input)),
      },
    ],
  } as any)

  const rawJson = extractAssistantJson(response)
  const jsonText = coerceJsonText(rawJson)
  const parsed = CompetitorResponseSchema.parse(
    JSON.parse(jsonText || "{}"),
  )

  const competitors = parsed.competitors
    .map((entry) => sanitizeCompetitor(entry))
    .filter((entry) => entry.name)
    .slice(0, MAX_COMPETITORS)

  const researchNotes = Array.isArray(parsed.researchNotes)
    ? Array.from(new Set(parsed.researchNotes))
        .map((note) => sanitizeText(note, MAX_NOTE_LENGTH))
        .filter((note): note is string => Boolean(note))
        .slice(0, 6)
    : null

  console.info("[productInsights:competitors] competitor landscape ready", {
    productId,
    competitorCount: competitors.length,
  })

  return {
    competitors,
    researchNotes: researchNotes ?? null,
    model: parsed.model ?? model,
  }
}

export function toStageData(
  result: DiscoverProductCompetitorsResult,
): ProductInsightCompetitorStageData {
  return {
    competitors: result.competitors,
    model: result.model,
    generatedAt: new Date().toISOString(),
    researchNotes: result.researchNotes ?? null,
  }
}
