import { z } from "zod"

import { getOpenAIClient } from "@/lib/server/openai"
import { coerceJsonText, extractAssistantJson } from "@/lib/server/openaiResponse"

import {
  ProductIdeaCrawlResult,
  ProductIdeaPageSnapshot,
  ProductIdeaProductContext,
  ProductIdeaSynthesis,
  ProductIdeaSummary,
} from "./types"

const MAX_PAGE_RECORDS = 12
const MAX_HEADINGS_PER_PAGE = 6
const MAX_SNIPPET_LENGTH = 1200
const MAX_JSONLD_ITEMS = 8
const MAX_STRING_LENGTH = 220

const SummarySchema = z.object({
  overview: z.string().min(1),
  valuePropositions: z.array(z.string().min(1)).min(1),
  targetUsers: z.array(z.string().min(1)).min(1),
  keyFeatures: z.array(z.string().min(1)).min(1),
  painPointsAddressed: z.array(z.string().min(1)).min(1),
  toneAndStyle: z.array(z.string().min(1)).min(1),
})

const ResponseSchema = SummarySchema

function truncate(value: string | undefined | null, max = MAX_STRING_LENGTH) {
  if (!value) return value ?? undefined
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function sanitizeHeadings(headings?: string[]): string[] {
  if (!Array.isArray(headings)) return []
  return headings
    .map((heading) => truncate(heading?.trim() || ""))
    .filter((heading): heading is string => typeof heading === "string" && heading.length > 0)
    .slice(0, MAX_HEADINGS_PER_PAGE)
}

function simplifyJsonLdEntry(entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== "object") return null
  if (Array.isArray(entry)) {
    for (const item of entry) {
      const simplified = simplifyJsonLdEntry(item)
      if (simplified) return simplified
    }
    return null
  }
  const obj = entry as Record<string, unknown>
  const summary: Record<string, unknown> = {}
  const keysToPick = [
    "@type",
    "name",
    "headline",
    "description",
    "text",
    "url",
    "applicationCategory",
    "category",
    "audience",
    "price",
    "priceCurrency",
    "availability",
  ]
  for (const key of keysToPick) {
    const value = obj[key]
    if (typeof value === "string") {
      summary[key] = truncate(value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>
      const nestedSummary: Record<string, unknown> = {}
      const nestedKeys = ["name", "description", "url", "price", "priceCurrency"]
      for (const nk of nestedKeys) {
        const nestedValue = nested[nk]
        if (typeof nestedValue === "string") {
          nestedSummary[nk] = truncate(nestedValue)
        }
      }
      if (Object.keys(nestedSummary).length) {
        summary[key] = nestedSummary
      }
    }
  }
  if (obj.offers) {
    const offersValue = obj.offers
    if (Array.isArray(offersValue)) {
      const offerSummaries = offersValue
        .map((offer) => simplifyJsonLdEntry(offer))
        .filter(Boolean)
        .slice(0, 2) as Record<string, unknown>[]
      if (offerSummaries.length) summary.offers = offerSummaries
    } else if (typeof offersValue === "object") {
      const offerSummary = simplifyJsonLdEntry(offersValue)
      if (offerSummary) summary.offers = offerSummary
    }
  }
  return Object.keys(summary).length ? summary : null
}

export function simplifyJsonLd(entries?: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(entries)) return []
  const simplified: Record<string, unknown>[] = []
  for (const entry of entries) {
    const simplifiedEntry = simplifyJsonLdEntry(entry)
    if (simplifiedEntry) simplified.push(simplifiedEntry)
    if (simplified.length >= MAX_JSONLD_ITEMS) break
  }
  return simplified
}

function trimSnippet(snippet?: string | null): string | undefined {
  if (!snippet) return undefined
  const trimmed = snippet.trim()
  if (!trimmed) return undefined
  return truncate(trimmed, MAX_SNIPPET_LENGTH)
}

function sanitizeProductContext(
  product?: ProductIdeaProductContext,
): Record<string, unknown> | null {
  if (!product) return null
  const {
    name,
    tagline,
    description,
    pricingModel,
    startingPriceCents,
    currencyCode,
    type,
    keywords,
    platforms,
  } = product
  const sanitized: Record<string, unknown> = {
    name,
  }
  if (tagline) sanitized.tagline = truncate(tagline, 160)
  if (description) sanitized.description = truncate(description, 800)
  if (pricingModel) sanitized.pricingModel = pricingModel
  if (typeof startingPriceCents === "number") {
    sanitized.startingPriceCents = startingPriceCents
  }
  if (currencyCode) sanitized.currencyCode = currencyCode
  if (type) sanitized.type = type
  if (Array.isArray(keywords) && keywords.length) {
    sanitized.keywords = keywords.filter(Boolean).slice(0, 8)
  }
  if (Array.isArray(platforms) && platforms.length) {
    sanitized.platforms = platforms.filter(Boolean).slice(0, 6)
  }
  return sanitized
}

function buildModelInput(
  crawl: ProductIdeaCrawlResult,
  productContext?: ProductIdeaProductContext,
) {
  const okPages = crawl.pages
    .filter((page) => page.status === "ok")
    .slice(0, MAX_PAGE_RECORDS)

  const pages = okPages.map((page) => sanitizePage(page))
  const issues = crawl.pages
    .filter((page) => page.status === "error")
    .map((page) => ({ url: page.url, error: page.error || "Unknown error" }))

  const productMeta = sanitizeProductContext(productContext)

  return {
    product: {
      baseUrl: crawl.baseUrl,
      sitemapUrl: crawl.sitemapUrl,
      crawledAt: crawl.fetchedAt,
      pageCount: crawl.pages.length,
      ...(productMeta ? { details: productMeta } : {}),
    },
    pages,
    issues,
  }
}

export function sanitizePage(page: ProductIdeaPageSnapshot) {
  return {
    url: page.url,
    title: truncate(page.title),
    metaDescription: truncate(page.metaDescription),
    ogDescription: truncate(page.ogDescription),
    headings: sanitizeHeadings(page.headings),
    keywords: (page.keywords || []).slice(0, 8),
    snippet: trimSnippet(page.textSnippet),
    jsonLd: simplifyJsonLd(page.jsonLd),
  }
}

export async function synthesizeProductIdea(
  crawl: ProductIdeaCrawlResult,
  productContext?: ProductIdeaProductContext,
): Promise<ProductIdeaSynthesis> {
  const openai = getOpenAIClient()
  const modelInput = buildModelInput(crawl, productContext)
  console.info("[productIdeas:summarizer] sending crawl to model", {
    pageCount: modelInput.pages.length,
    issueCount: modelInput.issues.length,
    hasProductContext: Boolean(productContext),
  })

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.15,
    max_output_tokens: 850,
    text: {
      format: {
        type: "json_schema",
        name: "product_idea_summary",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            overview: { type: "string", minLength: 1 },
            valuePropositions: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
            targetUsers: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
            keyFeatures: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
            painPointsAddressed: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
            toneAndStyle: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
          },
          required: [
            "overview",
            "valuePropositions",
            "targetUsers",
            "keyFeatures",
            "painPointsAddressed",
            "toneAndStyle",
          ],
        },
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are a product strategist helping founders harvest actionable insights from their own product website. Respond with concise JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instructions: {
            objective:
              "Summarize the product's positioning, differentiators, audiences, and messaging strictly from the crawled content.",
            styleGuidelines: [
              "Keep each list to 3–5 items unless evidence supports more.",
              "Highlight pain points solved and the messaging used to address them.",
              "Avoid speculating beyond the provided content; note limitations where appropriate.",
              "Use sentence case, no trailing punctuation in list items unless needed.",
            ],
            productContext:
              productContext
                ? {
                    name: productContext.name,
                    tagline: productContext.tagline,
                    description: productContext.description,
                    pricingModel: productContext.pricingModel,
                    startingPriceCents: productContext.startingPriceCents,
                    currencyCode: productContext.currencyCode,
                    type: productContext.type,
                    keywords: productContext.keywords,
                    platforms: productContext.platforms,
                  }
                : null,
          },
          crawl: modelInput,
        }),
      },
    ],
  } as any)

  const raw = extractAssistantJson(response)
  const jsonText = coerceJsonText(raw)
  let parsed: ProductIdeaSummary
  try {
    const json = jsonText ? JSON.parse(jsonText) : {}
    parsed = ResponseSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Model returned invalid schema: ${error.message}`)
    }
    throw error
  }

  return {
    summary: parsed,
    model: "gpt-4.1-mini",
  }
}
