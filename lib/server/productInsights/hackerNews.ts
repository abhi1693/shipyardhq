import { createHash } from "node:crypto"

import { z } from "zod"

import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import { getRedisClient } from "@/lib/server/redis"
import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"
import type {
  ProductInsightCompetitor,
  ProductInsightHackerNewsQuery,
  ProductInsightHackerNewsSummary,
  ProductInsightHackerNewsStory,
} from "@/types/product-insights"

const HACKER_NEWS_PROVIDER_MODEL = "hn.algolia/v1"
const MAX_QUERY_COUNT = 10
const MAX_TOTAL_STORIES = 18
const STORIES_PER_QUERY = 12
const SEARCH_WINDOW_DAYS = 365
const FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_SECONDS = 60 * 60 * 3

const CacheSchema = z.object({
  queries: z.array(
    z.object({
      query: z.string(),
      rationale: z.string().nullable().optional(),
    }),
  ),
  stories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().nullable().optional(),
      discussionUrl: z.string(),
      author: z.string().nullable().optional(),
      points: z.number().nullable().optional(),
      numComments: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      snippet: z.string().nullable().optional(),
      matchedQueries: z.array(z.string()).nullable().optional(),
    }),
  ),
  summary: z
    .object({
      summary: z.string(),
      highlights: z.array(z.string()),
      topStories: z
        .array(
          z.object({
            title: z.string(),
            discussionUrl: z.string(),
            keyTakeaway: z.string().nullable().optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  model: z.string(),
  cachedAt: z.string().nullable().optional(),
})

type CachePayload = z.infer<typeof CacheSchema>

type DiscoverProductHackerNewsMentionsInput = {
  productId: string
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  competitors?: ProductInsightCompetitor[] | null
  forceRefresh?: boolean
}

export type DiscoverProductHackerNewsMentionsResult = {
  queries: ProductInsightHackerNewsQuery[]
  stories: ProductInsightHackerNewsStory[]
  summary: ProductInsightHackerNewsSummary | null
  model: string
  apiCalls: number
  fromCache?: boolean
}

type HackerNewsHit = {
  objectID: string
  title?: string | null
  url?: string | null
  author?: string | null
  points?: number | null
  num_comments?: number | null
  created_at_i?: number | null
  story_text?: string | null
  _highlightResult?: {
    title?: { value?: string | null } | null
    story_text?: { value?: string | null } | null
  }
  _snippetResult?: {
    story_text?: { value?: string | null } | null
  }
}

type HackerNewsSearchResponse = {
  hits?: HackerNewsHit[]
}

const SummarySchema = z.object({
  summary: z.string().min(12),
  highlights: z.array(z.string().min(6)).min(1).max(6),
  topStories: z
    .array(
      z.object({
        title: z.string().min(4),
        discussionUrl: z.string().url(),
        keyTakeaway: z.string().optional().nullable(),
      }),
    )
    .max(5)
    .nullable(),
})

function resolveCacheNamespace(base: string) {
  const prefix =
    process.env.REDIS_ENV_NAMESPACE?.trim() || process.env.NODE_ENV?.trim()
  return prefix ? `${prefix}:${base}` : base
}

const HN_CACHE_NAMESPACE = resolveCacheNamespace(
  "productInsights:hackerNews:v1",
)

function buildCacheKey(productId: string, queryHash: string) {
  return `${HN_CACHE_NAMESPACE}:${productId}:${queryHash}`
}

function hashQueries(queries: ProductInsightHackerNewsQuery[]): string {
  const hash = createHash("sha256")
  for (const entry of queries) {
    hash.update(entry.query)
    if (entry.rationale) {
      hash.update("::")
      hash.update(entry.rationale)
    }
  }
  return hash.digest("hex").slice(0, 24)
}

function sanitizeQuery(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeForDedup(value: string) {
  return value.trim().toLowerCase()
}

function deriveKeywords(
  product: ProductInsightProductContext,
  summary?: ProductInsightSummary | null,
): string[] {
  const keywords = new Set<string>()

  for (const keyword of product.keywords ?? []) {
    if (typeof keyword === "string" && keyword.trim().length > 2) {
      keywords.add(keyword.trim())
    }
  }

  if (summary) {
    for (const feature of summary.keyFeatures ?? []) {
      if (feature && feature.length <= 80) {
        keywords.add(feature)
      }
    }

    for (const valueProp of summary.valuePropositions ?? []) {
      if (valueProp && valueProp.length <= 80) {
        keywords.add(valueProp)
      }
    }
    for (const painPoint of summary.painPointsAddressed ?? []) {
      if (painPoint && painPoint.length <= 80) {
        keywords.add(painPoint)
      }
    }
  }

  return Array.from(keywords).slice(0, 12)
}

function buildQueries(
  product: ProductInsightProductContext,
  summary: ProductInsightSummary | null | undefined,
  competitors: ProductInsightCompetitor[] | null | undefined,
): ProductInsightHackerNewsQuery[] {
  const queries: ProductInsightHackerNewsQuery[] = []
  const dedupe = new Set<string>()

  function addQuery(query: string, rationale?: string | null) {
    const sanitized = sanitizeQuery(query)
    if (!sanitized) return
    const key = normalizeForDedup(sanitized)
    if (dedupe.has(key)) return
    dedupe.add(key)
    queries.push({ query: sanitized, rationale: rationale ?? null })
  }

  const productName = sanitizeQuery(product.name)
  const slugLikeName = sanitizeQuery(product.name?.replace(/\s+/g, ""))

  if (productName) {
    addQuery(`"${productName}"`, "Exact product name mentions")
    addQuery(`${productName} review`, "Product reviews and feedback")
    addQuery(`${productName} launch`, "Launch retrospectives or updates")
    addQuery(`${productName} alternative`, "Competitor comparisons")
    addQuery(`${productName} pricing`, "Pricing reactions")
  }

  if (slugLikeName && slugLikeName !== productName) {
    addQuery(slugLikeName, "Product references without spacing")
  }

  const competitorEntries = (competitors ?? [])
    .map((entry) => sanitizeQuery(entry.name))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 3)

  for (const competitorName of competitorEntries) {
    addQuery(`"${competitorName}"`, "Monitor competitor launch chatter")
    addQuery(
      `${competitorName} alternative`,
      "Identify adjacent solution comparisons",
    )
    if (productName) {
      addQuery(
        `${productName} vs ${competitorName}`,
        "Head-to-head evaluation threads",
      )
    }
    if (queries.length >= MAX_QUERY_COUNT) {
      return queries.slice(0, MAX_QUERY_COUNT)
    }
  }

  const keywords = deriveKeywords(product, summary)
  const keywordSuffixes = [" tool", " software", " platform", " alternative"]

  for (const keyword of keywords.slice(0, 5)) {
    if (queries.length >= MAX_QUERY_COUNT) break
    addQuery(keyword, "Topic-level discovery")
    if (queries.length >= MAX_QUERY_COUNT) break
    for (const suffix of keywordSuffixes) {
      if (queries.length >= MAX_QUERY_COUNT) break
      if (keyword.length + suffix.length > 80) continue
      addQuery(`${keyword}${suffix}`, "Related solution chatter")
      if (queries.length >= MAX_QUERY_COUNT) break
      if (productName) {
        addQuery(
          `${productName} ${keyword}${suffix.includes("alternative") ? "" : ""}`.trim(),
          "Product feature-specific conversation",
        )
      }
    }
  }

  if (!queries.length && productName) {
    addQuery(productName)
  }

  return queries.slice(0, MAX_QUERY_COUNT)
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "")
}

function sanitizeSnippet(value?: string | null) {
  if (typeof value !== "string") return null
  const stripped = stripHtml(value).replace(/\s+/g, " ").trim()
  if (!stripped) return null
  return stripped.length > 360 ? `${stripped.slice(0, 357)}…` : stripped
}

function sanitizeStory(
  hit: HackerNewsHit,
  matchedQueries: Set<string>,
): ProductInsightHackerNewsStory | null {
  const title = sanitizeQuery(hit.title ?? "")
  if (!title) return null

  const storyTextHighlight =
    hit._highlightResult?.story_text?.value ??
    hit._snippetResult?.story_text?.value ??
    hit.story_text ??
    null

  const createdAt =
    typeof hit.created_at_i === "number" && Number.isFinite(hit.created_at_i)
      ? new Date(hit.created_at_i * 1000).toISOString()
      : null

  const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`

  return {
    id: hit.objectID,
    title,
    url: hit.url?.trim() || null,
    discussionUrl,
    author: hit.author?.trim() || null,
    points:
      typeof hit.points === "number" && Number.isFinite(hit.points)
        ? hit.points
        : null,
    numComments:
      typeof hit.num_comments === "number" && Number.isFinite(hit.num_comments)
        ? hit.num_comments
        : null,
    createdAt,
    snippet: sanitizeSnippet(storyTextHighlight),
    matchedQueries:
      matchedQueries.size > 0 ? Array.from(matchedQueries.values()) : null,
  }
}

async function searchHackerNews(query: string): Promise<HackerNewsHit[]> {
  const baseUrl = "https://hn.algolia.com/api/v1/search"
  const params = new URLSearchParams()
  params.set("query", query)
  params.set("tags", "story")
  params.set("hitsPerPage", String(STORIES_PER_QUERY))
  params.set("page", "0")
  params.set("restrictSearchableAttributes", "title,url,story_text")
  params.set(
    "attributesToRetrieve",
    "title,url,author,points,num_comments,created_at_i,story_text",
  )
  params.set("attributesToHighlight", "title,story_text")
  params.set("attributesToSnippet", "story_text:40")
  params.set("analytics", "false")

  const sinceSeconds =
    Math.floor(Date.now() / 1000) - SEARCH_WINDOW_DAYS * 86400
  params.set("numericFilters", `created_at_i>${sinceSeconds}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "ShipyardHQ-ProductInsights/1.0 (+https://shipyardhq.dev)",
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(
        `Failed to query Hacker News (status ${response.status}): ${body}`,
      )
    }

    const json = (await response.json()) as HackerNewsSearchResponse
    return Array.isArray(json.hits) ? json.hits : []
  } finally {
    clearTimeout(timeout)
  }
}

async function readFromCache(cacheKey: string): Promise<CachePayload | null> {
  try {
    const redis = await getRedisClient()
    if (!redis) return null
    const cached = await redis.get(cacheKey)
    if (!cached) return null
    return CacheSchema.parse(JSON.parse(cached))
  } catch (error) {
    console.warn("[productInsights:hackerNews] cache read failed", {
      cacheKey,
      error,
    })
    return null
  }
}

async function writeToCache(cacheKey: string, payload: CachePayload) {
  try {
    const redis = await getRedisClient()
    if (!redis) return
    await redis.set(cacheKey, JSON.stringify(payload), {
      EX: CACHE_TTL_SECONDS,
    })
  } catch (error) {
    console.warn("[productInsights:hackerNews] cache write failed", {
      cacheKey,
      error,
    })
  }
}

export async function discoverProductHackerNewsMentions(
  input: DiscoverProductHackerNewsMentionsInput,
): Promise<DiscoverProductHackerNewsMentionsResult> {
  const { productId, product, summary, competitors, forceRefresh } = input

  const queries = buildQueries(product, summary, competitors)

  if (!queries.length) {
    return {
      queries: [],
      stories: [],
      summary: null,
      model: HACKER_NEWS_PROVIDER_MODEL,
      apiCalls: 0,
    }
  }

  const cacheKey = buildCacheKey(productId, hashQueries(queries))

  if (!forceRefresh) {
    const cached = await readFromCache(cacheKey)
    if (cached) {
      return {
        queries: cached.queries,
        stories: cached.stories,
        summary: cached.summary ?? null,
        model: cached.model,
        apiCalls: 0,
        fromCache: true,
      }
    }
  }

  console.info("[productInsights:hackerNews] querying Hacker News", {
    productId,
    queryCount: queries.length,
  })

  const results = await Promise.allSettled(
    queries.map((entry) =>
      searchHackerNews(entry.query).then((hits) => ({
        hits,
        query: entry.query,
      })),
    ),
  )

  const storyMap = new Map<
    string,
    { story: ProductInsightHackerNewsStory; queries: Set<string> }
  >()

  let apiCalls = 0

  for (let index = 0; index < results.length; index += 1) {
    const outcome = results[index]
    const query = queries[index]?.query ?? ""

    if (outcome.status === "rejected") {
      console.error("[productInsights:hackerNews] query failed", {
        productId,
        query,
        error: outcome.reason,
      })
      continue
    }

    apiCalls += 1

    for (const hit of outcome.value.hits ?? []) {
      if (!hit?.objectID) continue
      const existing = storyMap.get(hit.objectID)
      if (existing) {
        existing.queries.add(query)
        continue
      }

      const sanitized = sanitizeStory(hit, new Set([query]))
      if (!sanitized) continue
      storyMap.set(hit.objectID, {
        story: sanitized,
        queries: new Set(sanitized.matchedQueries ?? []),
      })
    }
  }

  const stories = Array.from(storyMap.values())
    .map(({ story, queries: matched }) => ({
      ...story,
      matchedQueries:
        matched.size > 0 ? Array.from(new Set(matched.values())) : null,
    }))
    .sort((a, b) => {
      const aScore = typeof a.points === "number" ? a.points : -1
      const bScore = typeof b.points === "number" ? b.points : -1
      if (bScore !== aScore) return bScore - aScore
      const aComments = typeof a.numComments === "number" ? a.numComments : -1
      const bComments = typeof b.numComments === "number" ? b.numComments : -1
      return bComments - aComments
    })
    .slice(0, MAX_TOTAL_STORIES)

  const summaryResult =
    (await summarizeHackerNewsStories({
      product,
      summary,
      stories,
    })) ?? buildFallbackSummary(product, stories)

  if (stories.length) {
    await writeToCache(cacheKey, {
      queries,
      stories,
      summary: summaryResult,
      model: HACKER_NEWS_PROVIDER_MODEL,
      cachedAt: new Date().toISOString(),
    })
  }

  return {
    queries,
    stories,
    summary: summaryResult,
    model: HACKER_NEWS_PROVIDER_MODEL,
    apiCalls,
  }
}

function buildFallbackSummary(
  product: ProductInsightProductContext,
  stories: ProductInsightHackerNewsStory[],
): ProductInsightHackerNewsSummary {
  const topStories = stories.slice(0, 3)
  const titleList = topStories.map((story) => `“${story.title}”`).join(", ")
  const summary = topStories.length
    ? `Recent Hacker News threads mentioning ${product.name} include ${titleList}.`
    : `${product.name} has limited recent activity on Hacker News.`

  const highlights = topStories.length
    ? topStories.map((story) => {
        const points = typeof story.points === "number" ? story.points : null
        const comments =
          typeof story.numComments === "number" ? story.numComments : null
        const metrics: string[] = []
        if (points !== null) metrics.push(`${points} points`)
        if (comments !== null) metrics.push(`${comments} comments`)
        const metricsText = metrics.length ? ` (${metrics.join(", ")})` : ""
        const snippet = story.snippet?.trim()
        if (snippet) {
          return `${story.title}${metricsText}: ${snippet}`
        }
        const queries = story.matchedQueries?.length
          ? `Matched queries: ${story.matchedQueries.join(" • ")}`
          : "No snippet captured—review the thread for details."
        return `${story.title}${metricsText}: ${queries}`
      })
    : [
        "No meaningful Hacker News chatter captured in the last 12 months—monitor future launches or announcements.",
      ]

  return {
    summary,
    highlights,
    topStories: topStories.map((story) => ({
      title: story.title,
      discussionUrl: story.discussionUrl,
      keyTakeaway: story.snippet?.trim() || null,
    })),
  }
}
async function summarizeHackerNewsStories(input: {
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  stories: ProductInsightHackerNewsStory[]
}): Promise<ProductInsightHackerNewsSummary | null> {
  const { stories } = input
  if (!stories.length) return null

  const topStories = stories.slice(0, 6).map((story) => ({
    title: story.title,
    discussionUrl: story.discussionUrl,
    points: story.points ?? null,
    comments: story.numComments ?? null,
    snippet: story.snippet ?? null,
    matchedQueries: story.matchedQueries ?? null,
  }))

  try {
    const openai = getOpenAIClient()
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      max_output_tokens: 600,
      text: {
        format: {
          type: "json_schema",
          name: "hacker_news_insight_summary",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string", minLength: 12 },
              highlights: {
                type: "array",
                minItems: 1,
                maxItems: 6,
                items: { type: "string", minLength: 6 },
              },
              topStories: {
                type: ["array", "null"],
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string", minLength: 4 },
                    discussionUrl: { type: "string", minLength: 8 },
                    keyTakeaway: { type: ["string", "null"], minLength: 6 },
                  },
                  required: ["title", "discussionUrl", "keyTakeaway"],
                },
                default: null,
              },
            },
            required: ["summary", "highlights", "topStories"],
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a product analyst. Distill the Hacker News discussions into concise takeaways for a go-to-market team. Respond with JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            objective:
              "Summarize launch chatter and product feedback from the latest Hacker News threads.",
            guidance: [
              "Highlight recurring praise, pain points, and comparisons buyers might make.",
              "If threads compare competitors, surface the strongest contrast.",
              "Focus on actionable observations a product or marketing lead can act on within a sprint or two.",
              "Prefer concrete phrasing over generic statements.",
            ],
            product: {
              name: input.product.name,
              tagline: input.product.tagline,
              keywords: input.product.keywords,
            },
            summary: input.summary?.overview ?? null,
            stories: topStories.map((story) => ({
              title: story.title,
              discussionUrl: story.discussionUrl,
              points: story.points,
              comments: story.comments,
              snippet: story.snippet,
              matchedQueries: story.matchedQueries,
            })),
          }),
        },
      ],
    } as any)

    const raw = extractAssistantJson(response)
    const text = coerceJsonText(raw)
    if (!text) return null
    const parsed = SummarySchema.safeParse(JSON.parse(text))
    if (!parsed.success) {
      console.error("[productInsights:hackerNews] failed to parse summary", {
        issues: parsed.error.issues,
      })
      return null
    }

    return {
      summary: parsed.data.summary.trim(),
      highlights: parsed.data.highlights.map((item) => item.trim()),
      topStories:
        parsed.data.topStories
          ?.map((entry) => ({
            title: entry.title.trim(),
            discussionUrl: entry.discussionUrl.trim(),
            keyTakeaway: entry.keyTakeaway?.trim() || null,
          }))
          .filter((entry) => Boolean(entry.title)) ?? null,
    }
  } catch (error) {
    console.warn("[productInsights:hackerNews] summary generation failed", {
      error,
    })
    return null
  }
}
