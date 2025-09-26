import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@clerk/nextjs/server"

import { getOpenAIClient } from "@/lib/server/openai"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { normalizeProductAutofill } from "@/lib/productWizard/autofill"
import {
  PLATFORMS,
  PRICING_MODELS,
  PRODUCT_TYPES,
} from "@/lib/productWizard/constants"

const RequestSchema = z.object({
  url: z.string().url(),
  categories: z.array(z.string()).max(64).optional(),
})

const ModelOutputSchema = z.object({
  name: z.string().optional().nullable(),
  tagline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  productType: z.string().optional().nullable(),
  pricingModel: z.string().optional().nullable(),
  startingPriceCents: z.number().int().nonnegative().optional().nullable(),
  currencyCode: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  platforms: z.array(z.string()).optional().nullable(),
  categoryName: z.string().optional().nullable(),
  githubUrl: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  demoUrl: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
})

type ModelOutput = z.infer<typeof ModelOutputSchema>

const USER_AGENT = "ShipyardHQ-Autofill/1.0"
const FETCH_TIMEOUT_MS = 8000
const MAX_CONTENT_CHARS = 12000
const PRICING_PATHS = [
  "/pricing",
  "/pricing/",
  "/plans",
  "/plans/",
  "/pricing/index.html",
  "/plans/index.html",
]
const ISO_CURRENCY_CODES = new Set([
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "JPY",
  "INR",
  "NZD",
  "CHF",
  "SGD",
  "SEK",
  "DKK",
  "NOK",
  "ZAR",
])
const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  $: "USD",
  CA$: "CAD",
  C$: "CAD",
  A$: "AUD",
  AU$: "AUD",
  NZ$: "NZD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "￥": "JPY",
  "₹": "INR",
}

function stripHtmlNoise(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[^>]*-->/g, " ")
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ")
  return withoutTags.replace(/[\s\u00A0]+/g, " ").trim()
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : null
}

function sanitizeTargetUrl(rawUrl: string) {
  try {
    const normalized = new URL(rawUrl)
    if (!["http:", "https:"].includes(normalized.protocol)) return null
    return normalized.toString()
  } catch {
    return null
  }
}

type MetaTag = Record<string, string>

function parseMetaTags(html: string): MetaTag[] {
  const tags: MetaTag[] = []
  const metaRegex = /<meta\s+[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = metaRegex.exec(html))) {
    const tag = match[0]
    const attrs: MetaTag = {}
    const attrRegex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
    let attrMatch: RegExpExecArray | null
    while ((attrMatch = attrRegex.exec(tag))) {
      const [, rawKey, dq, sq, bare] = attrMatch
      const key = rawKey.toLowerCase()
      const value = (dq ?? sq ?? bare ?? "").trim()
      if (key) attrs[key] = value
    }
    if (Object.keys(attrs).length) tags.push(attrs)
  }
  return tags
}

function extractMetaContent(html: string, keys: string[]): string | null {
  if (!keys.length) return null
  const target = new Set(keys.map((k) => k.toLowerCase()))
  for (const attrs of parseMetaTags(html)) {
    const metaKey =
      attrs["name"]?.toLowerCase() ?? attrs["property"]?.toLowerCase()
    if (metaKey && target.has(metaKey)) {
      const content = attrs["content"]?.trim()
      if (content) return content
    }
  }
  return null
}

function extractMetaKeywords(html: string): string[] {
  const raw = extractMetaContent(html, ["keywords"])
  if (!raw) return []
  return raw
    .split(/[,;\n\r]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function buildPrimaryCopy(text: string, maxLength = 600): string {
  if (!text) return ""
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? []
  const assembled = sentences.slice(0, 4).join(" ").trim() || text
  return assembled.slice(0, maxLength).trim()
}

function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null
  const trimmed = text.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/)
  if (match && match[0]) {
    return match[0].trim()
  }
  return trimmed
}

type PricingContext = {
  url: string
  metaDescription?: string | null
  ogDescription?: string | null
  twitterDescription?: string | null
  keywords?: string[]
  snippet?: string
}

type PricingInference = {
  startingPriceCents?: number
  currencyCode?: string
  pricingModel?: (typeof PRICING_MODELS)[number]
}

async function fetchPricingContext(
  baseUrl: URL,
): Promise<PricingContext | null> {
  const seen = new Set<string>()
  for (const path of PRICING_PATHS) {
    let pricingUrl: URL
    try {
      pricingUrl = new URL(path, baseUrl)
    } catch {
      continue
    }
    const href = pricingUrl.toString()
    if (seen.has(href)) continue
    seen.add(href)
    if (href === baseUrl.toString()) continue

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(href, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      })
      if (!response.ok) continue
      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("text/html")) continue
      const html = await response.text()
      const metaDescription = extractMetaContent(html, ["description"])
      const ogDescription = extractMetaContent(html, ["og:description"])
      const twitterDescription = extractMetaContent(html, [
        "twitter:description",
      ])
      const keywords = extractMetaKeywords(html).map((keyword) =>
        keyword.toLowerCase(),
      )
      const snippet = stripHtmlNoise(html).slice(0, MAX_CONTENT_CHARS)
      if (!snippet && !metaDescription && !keywords.length) continue
      return {
        url: href,
        metaDescription,
        ogDescription,
        twitterDescription,
        keywords,
        snippet,
      }
    } catch {
      continue
    } finally {
      clearTimeout(timeout)
    }
  }
  return null
}

function normalizeCurrencyCode(code?: string | null): string | undefined {
  if (!code) return undefined
  const upper = code.toUpperCase()
  if (ISO_CURRENCY_CODES.has(upper)) return upper
  return undefined
}

function parseAmountToCents(raw: string): number | undefined {
  if (!raw) return undefined
  let valueString = raw.trim()
  if (!valueString) return undefined
  if (valueString.includes(",") && !valueString.includes(".")) {
    valueString = valueString.replace(/,/g, ".")
  }
  valueString = valueString.replace(/,/g, "")
  const parsed = Number.parseFloat(valueString)
  if (!Number.isFinite(parsed)) return undefined
  return Math.round(parsed * 100)
}

function inferPricingModelFromText(
  text?: string | null,
): (typeof PRICING_MODELS)[number] | undefined {
  if (!text) return undefined
  const lower = text.toLowerCase()
  if (/(lifetime|one[-\s]?time|buy once|perpetual)/.test(lower)) {
    return "one_time"
  }
  const subscriptionSignals =
    /(per month|per user|per seat|monthly|annually|annual|per year|per month|subscription|mo\b|yr\b)/
  if (subscriptionSignals.test(lower)) {
    return "subscription"
  }
  if (
    /(custom pricing|contact sales|talk to sales|request (a )?quote|enterprise pricing)/.test(
      lower,
    )
  ) {
    return "custom"
  }
  const hasFree = /(free plan|free tier|free forever|free)/.test(lower)
  const hasPaid =
    /(paid plan|upgrade|premium|starting at|from \$|from €|from £|per month)/.test(
      lower,
    )
  if (hasFree && hasPaid) {
    return "freemium"
  }
  if (hasFree) {
    return "free"
  }
  return undefined
}

function extractPricingFallback(
  texts: (string | null | undefined)[],
): PricingInference {
  const inference: PricingInference = {}

  for (const text of texts) {
    if (!text) continue
    const symbolRegex =
      /(CA\$|C\$|A\$|AU\$|NZ\$|\$|€|£|¥|￥|₹)\s*(\d[\d.,]*)\s*(?:per|\/)?\s*(month|mo|year|yr|annual|annually|one-time|lifetime|once)?/i
    const symbolMatch = symbolRegex.exec(text)
    if (symbolMatch && inference.startingPriceCents == null) {
      const [, symbol, amount, cadence] = symbolMatch
      const normalizedSymbol = symbol.toUpperCase()
      const currencyCode =
        CURRENCY_SYMBOL_MAP[normalizedSymbol] ||
        CURRENCY_SYMBOL_MAP[symbol] ||
        (normalizedSymbol.length === 1
          ? CURRENCY_SYMBOL_MAP[symbol]
          : undefined)
      const cents = parseAmountToCents(amount)
      if (cents != null) {
        inference.startingPriceCents = cents
        if (!inference.currencyCode && currencyCode) {
          inference.currencyCode = currencyCode
        }
        const cadenceModel = inferPricingModelFromText(cadence)
        if (!inference.pricingModel && cadenceModel) {
          inference.pricingModel = cadenceModel
        }
      }
    }

    if (inference.startingPriceCents == null) {
      const codeRegex =
        /\b(USD|EUR|GBP|AUD|CAD|JPY|INR|NZD|CHF|SGD|SEK|DKK|NOK|ZAR)\b[^\d]*(\d[\d.,]*)/i
      const codeMatch = codeRegex.exec(text)
      if (codeMatch) {
        const [, code, amount] = codeMatch
        const cents = parseAmountToCents(amount)
        if (cents != null) {
          inference.startingPriceCents = cents
          inference.currencyCode = normalizeCurrencyCode(code)
        }
      }
    }

    const trailingCodeRegex =
      /(\d[\d.,]*)\s*(USD|EUR|GBP|AUD|CAD|JPY|INR|NZD|CHF|SGD|SEK|DKK|NOK|ZAR)/i
    if (inference.startingPriceCents == null) {
      const trailingMatch = trailingCodeRegex.exec(text)
      if (trailingMatch) {
        const [, amount, code] = trailingMatch
        const cents = parseAmountToCents(amount)
        if (cents != null) {
          inference.startingPriceCents = cents
          inference.currencyCode = normalizeCurrencyCode(code)
        }
      }
    }

    if (!inference.pricingModel) {
      const model = inferPricingModelFromText(text)
      if (model) {
        inference.pricingModel = model
      }
    }
  }

  return inference
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await getActiveUserByClerkId(userId)
  if (!user) {
    return NextResponse.json({ error: "Account inactive" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const sanitizedUrl = sanitizeTargetUrl(parsed.data.url)
  if (!sanitizedUrl) {
    return NextResponse.json(
      { error: "Only http(s) URLs are supported" },
      { status: 400 },
    )
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI integration is not configured" },
      { status: 503 },
    )
  }

  let htmlContent: string
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(sanitizedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (status ${response.status})` },
        { status: 400 },
      )
    }

    htmlContent = await response.text()
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Timed out fetching the website" },
        { status: 408 },
      )
    }
    console.error("Autofill fetch error", error)
    return NextResponse.json(
      { error: "Unable to fetch website content" },
      { status: 400 },
    )
  }

  const title = extractTitle(htmlContent)
  const cleaned = stripHtmlNoise(htmlContent)
  const textSnippet = cleaned.slice(0, MAX_CONTENT_CHARS)
  const metaDescription = extractMetaContent(htmlContent, ["description"])
  const ogDescription = extractMetaContent(htmlContent, ["og:description"])
  const twitterDescription = extractMetaContent(htmlContent, [
    "twitter:description",
  ])
  const ogTitle = extractMetaContent(htmlContent, ["og:title"])
  const primaryCopySnippet = buildPrimaryCopy(cleaned)

  let pricingContext: PricingContext | null = null
  try {
    pricingContext = await fetchPricingContext(new URL(sanitizedUrl))
  } catch {
    pricingContext = null
  }

  const keywordSet = new Set<string>(
    extractMetaKeywords(htmlContent).map((keyword) => keyword.toLowerCase()),
  )
  for (const keyword of pricingContext?.keywords ?? []) {
    if (keyword) keywordSet.add(keyword.toLowerCase())
  }
  const metaKeywords = Array.from(keywordSet)

  const supplementalDetails = [
    metaDescription ? `Meta description: ${metaDescription}` : "",
    ogDescription && ogDescription !== metaDescription
      ? `OpenGraph description: ${ogDescription}`
      : "",
    twitterDescription &&
    twitterDescription !== metaDescription &&
    twitterDescription !== ogDescription
      ? `Twitter description: ${twitterDescription}`
      : "",
    ogTitle ? `OpenGraph title: ${ogTitle}` : "",
    metaKeywords.length ? `Meta keywords: ${metaKeywords.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\\n")

  const pricingDetails = pricingContext
    ? [
        `Pricing page URL: ${pricingContext.url}`,
        pricingContext.metaDescription
          ? `Pricing page meta description: ${pricingContext.metaDescription}`
          : "",
        pricingContext.ogDescription &&
        pricingContext.ogDescription !== pricingContext.metaDescription
          ? `Pricing page OpenGraph description: ${pricingContext.ogDescription}`
          : "",
        pricingContext.twitterDescription &&
        pricingContext.twitterDescription !== pricingContext.metaDescription &&
        pricingContext.twitterDescription !== pricingContext.ogDescription
          ? `Pricing page Twitter description: ${pricingContext.twitterDescription}`
          : "",
        pricingContext.keywords?.length
          ? `Pricing page keywords: ${pricingContext.keywords.join(", ")}`
          : "",
        pricingContext.snippet
          ? `Pricing page snippet: """${pricingContext.snippet}"""`
          : "",
      ]
        .filter(Boolean)
        .join("\\n")
    : ""

  const pricingFallback = extractPricingFallback([
    pricingContext?.metaDescription,
    pricingContext?.ogDescription,
    pricingContext?.twitterDescription,
    pricingContext?.snippet,
    metaDescription,
    ogDescription,
    twitterDescription,
    primaryCopySnippet,
  ])

  const openai = getOpenAIClient()

  let modelOutput: ModelOutput
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      max_output_tokens: 600,
      input: [
        {
          role: "system",
          content:
            "You are a product marketing assistant. Only output valid minified JSON with no markdown or commentary.",
        },
        {
          role: "user",
          content: `URL: ${sanitizedUrl}\n${
            parsed.data.categories?.length
              ? `Known categories: ${parsed.data.categories.join(", ")}\n`
              : ""
          }Allowed product types: ${PRODUCT_TYPES.join(", ")}\nAllowed pricing models: ${PRICING_MODELS.join(", ")}\nAvailable platforms: ${PLATFORMS.join(", ")}\n${
            title ? `Page title: ${title}\n` : ""
          }${supplementalDetails ? `${supplementalDetails}\n` : ""}${
            pricingDetails ? `${pricingDetails}\n` : ""
          }${
            primaryCopySnippet
              ? `Primary copy snippet: """${primaryCopySnippet}"""\n`
              : ""
          }Website text (truncated):\n"""${textSnippet}"""\nReturn a JSON object with this TypeScript type:\n${JSON.stringify(
            {
              name: "string | null",
              tagline: "string | null",
              description: "string | null",
              logoUrl: "string | null",
              productType: "string | null",
              pricingModel: "string | null",
              startingPriceCents: "number | null",
              currencyCode: "string | null",
              keywords: "string[] | null",
              platforms: "string[] | null",
              categoryName: "string | null",
              githubUrl: "string | null",
              twitterUrl: "string | null",
              demoUrl: "string | null",
              contactEmail: "string | null",
              ctaLabel: "string | null",
              ctaUrl: "string | null",
            },
          )}\nGuidelines:\n- Rewrite the description as a launch-ready overview using Markdown (bold, italics, bullet lists allowed, but never heading syntax like '#'). In this order, include: Product Overview (one-line elevator pitch plus brief plain-language summary and problem statement), Key Features (3–7 concise bullets highlighting differentiators or tiered plans if available), Target Audience / Use Cases (who it's for and typical workflows), and Benefits / Value Proposition (tangible outcomes and any proof points).\n- Always populate 'name' with the product brand or title and 'tagline' with a short, memorable elevator pitch derived from the supplied content.\n- Base all narrative details on the supplied meta descriptions, pricing context, primary copy snippet, and truncated website text.\n- Always include a keywords array with 3 to 6 concise, lowercase SEO keywords directly supported by the source content.\n- If pricing page context is provided, reference the actual plan names, price points, and differentiators; if pricing data is missing, explicitly note that pricing details are unavailable and do not guess.\n- Use null for unknown values and omit fields entirely when information is not available.\n- Never invent features or details not present in the provided content.`,
        },
      ],
    })

    const rawText = extractAssistantJson(response)
    const jsonText = coerceJsonText(rawText)
    let parsedJson: unknown
    try {
      parsedJson = jsonText ? JSON.parse(jsonText) : {}
    } catch (error) {
      console.error("Failed to parse OpenAI response", { rawText, error })
      return NextResponse.json(
        { error: "OpenAI returned malformed data" },
        { status: 502 },
      )
    }
    const parsedOutput = ModelOutputSchema.parse(parsedJson)
    const enrichedOutput: ModelOutput = { ...parsedOutput }

    if (!enrichedOutput.name) {
      const fallbackName = ogTitle || title
      if (fallbackName) {
        enrichedOutput.name = fallbackName
      }
    }

    if (!enrichedOutput.tagline) {
      const taglineSource =
        firstSentence(metaDescription) ||
        firstSentence(ogDescription) ||
        firstSentence(twitterDescription) ||
        firstSentence(pricingContext?.metaDescription) ||
        firstSentence(pricingContext?.ogDescription) ||
        firstSentence(pricingContext?.twitterDescription) ||
        firstSentence(primaryCopySnippet)
      if (taglineSource) {
        enrichedOutput.tagline = taglineSource
      }
    }

    if (
      (!enrichedOutput.keywords || enrichedOutput.keywords.length === 0) &&
      metaKeywords.length
    ) {
      enrichedOutput.keywords = metaKeywords.slice(0, 6)
    }

    if (
      (enrichedOutput.startingPriceCents == null ||
        Number.isNaN(enrichedOutput.startingPriceCents)) &&
      pricingFallback.startingPriceCents != null
    ) {
      enrichedOutput.startingPriceCents = pricingFallback.startingPriceCents
    }

    if (!enrichedOutput.currencyCode && pricingFallback.currencyCode) {
      enrichedOutput.currencyCode = pricingFallback.currencyCode
    }

    if (!enrichedOutput.pricingModel && pricingFallback.pricingModel) {
      enrichedOutput.pricingModel = pricingFallback.pricingModel
    }

    modelOutput = enrichedOutput
  } catch (error) {
    console.error("OpenAI autofill error", error)
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 502 },
    )
  }

  const { suggestion, warnings } = normalizeProductAutofill(modelOutput)

  return NextResponse.json({ suggestion, warnings })
}

function extractAssistantJson(response: any): string {
  if (!response?.output) return ""
  for (const item of response.output) {
    if (item?.type === "message") {
      for (const content of item.content ?? []) {
        if (content?.type === "output_text") {
          if (typeof content.text === "string") return content.text
          if (typeof content.text?.value === "string") return content.text.value
        }
        if (
          content?.type === "text" &&
          typeof content.text?.value === "string"
        ) {
          return content.text.value
        }
      }
    }
  }
  const outputText = (response as any)?.output_text
  if (typeof outputText === "string") return outputText
  if (Array.isArray(outputText)) {
    return outputText.join("\n")
  }
  return ""
}

function coerceJsonText(raw: string): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim()
  return withoutFence.replace(/\u0000/g, "").trim()
}
