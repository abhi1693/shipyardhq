import { z } from "zod"

import type {
  ProductIdeaRedditComment,
  ProductIdeaRedditDiscussionQuery,
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
  ProductIdeaSubreddit,
} from "@/types/product-ideas"
import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import { getRedisClient } from "@/lib/server/redis"
import type {
  ProductIdeaProductContext,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"
import {
  getRedditAccessToken,
  getRedditUserAgent,
} from "./redditClient"

const REDDIT_USER_AGENT = getRedditUserAgent()
function resolveCacheNamespace(base: string) {
  const prefix =
    process.env.REDIS_ENV_NAMESPACE?.trim() || process.env.NODE_ENV?.trim()
  return prefix ? `${prefix}:${base}` : base
}

const REDDIT_DISCUSSION_CACHE_NAMESPACE = resolveCacheNamespace(
  "productIdeas:redditDiscussions:v1",
)
const REDDIT_DISCUSSION_CACHE_TTL_SECONDS = 60 * 60 * 3
const MAX_QUERIES = 6
const MIN_QUERIES = 2
const MAX_POSTS_PER_QUERY = 10
const MAX_TOTAL_THREADS = 18
const MAX_COMMENTS_PER_THREAD = 3

const QueryPlanSchema = z.object({
  queries: z
    .array(
      z.object({
        query: z.string().min(4),
        rationale: z.string().optional().nullable(),
        targetSubreddit: z.string().optional().nullable(),
      }),
    )
    .min(MIN_QUERIES)
    .max(MAX_QUERIES),
})

const RedditCommentSchema = z.object({
  id: z.string(),
  author: z.string().optional().nullable(),
  body: z.string(),
  score: z.number().optional().nullable(),
  createdAt: z.string().optional().nullable(),
})

const RedditThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  permalink: z.string(),
  subreddit: z.string(),
  author: z.string().optional().nullable(),
  score: z.number().optional().nullable(),
  numComments: z.number().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  flairText: z.string().optional().nullable(),
  matchedQueries: z.array(z.string()).optional().nullable(),
  topComments: z.array(RedditCommentSchema).optional().nullable(),
})

const InsightItemSchema = z.object({
  insight: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional().nullable(),
  audience: z.string().optional().nullable(),
  evidence: z.array(z.string()).optional().nullable(),
  references: z.array(z.string()).optional().nullable(),
})

const InsightSectionSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  items: z.array(InsightItemSchema).min(1),
})

const InsightReportSchema = z.object({
  summary: z.string(),
  sections: z.array(InsightSectionSchema).min(1),
  recommendedFocus: z.array(z.string()).optional().nullable(),
})

const CacheSchema = z.object({
  queries: z.array(
    z.object({
      query: z.string(),
      rationale: z.string().optional().nullable(),
      targetSubreddit: z.string().optional().nullable(),
    }),
  ),
  threads: z.array(RedditThreadSchema),
  insights: InsightReportSchema.nullable(),
  model: z.string(),
})

function buildCacheKey(productId: string) {
  return `${REDDIT_DISCUSSION_CACHE_NAMESPACE}:${productId}`
}

function sanitizeOptionalText(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function truncateText(value: string | null | undefined, maxLength: number) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`
}

function normalizeSubredditName(name: string) {
  return name.replace(/^r\//i, "").trim().toLowerCase()
}

function safeParseJson<T>(text: string, context: string): T {
  const attempt = (input: string) => {
    try {
      return JSON.parse(input) as T
    } catch (error) {
      throw error
    }
  }

  try {
    return attempt(text)
  } catch {
    const sanitized = text
      .replace(/,(?=\s*[}\]])/g, "")
      .replace(/\uFEFF/g, "")

    try {
      return attempt(sanitized)
    } catch (secondaryError) {
      console.error(
        "[productIdeas:reddit] failed to parse model JSON",
        {
          context,
          original: text?.slice(0, 2000),
          error: secondaryError,
        },
      )
      throw secondaryError
    }
  }
}

function buildFallbackSubredditQuery({
  product,
  summary,
  subredditName,
}: {
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  subredditName: string
}): ProductIdeaRedditDiscussionQuery {
  const name = product.name?.trim()
  const candidates: string[] = []
  if (name) {
    candidates.push(name)
  }
  if (summary?.painPointsAddressed?.length) {
    candidates.push(summary.painPointsAddressed[0]!)
  } else if (summary?.keyFeatures?.length) {
    candidates.push(summary.keyFeatures[0]!)
  } else if (product.type) {
    candidates.push(product.type)
  }

  const unique = Array.from(
    new Set(
      candidates
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length > 0)),
    ),
  )

  const base = unique.slice(0, 2).join(" ") || name || subredditName
  const query = `${base} "ShipyardHQ" feedback`

  return {
    query,
    rationale: `Ensure r/${subredditName} is queried directly for recent feedback conversations.`,
    targetSubreddit: subredditName,
  }
}

type GenerateDiscussionQueriesInput = {
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  subreddits?: ProductIdeaSubreddit[] | null
}

async function generateDiscussionQueries(
  input: GenerateDiscussionQueriesInput,
): Promise<{
  queries: ProductIdeaRedditDiscussionQuery[]
  model: string
}> {
  const { product, summary, subreddits } = input
  const openai = getOpenAIClient()
  const payload: Record<string, unknown> = {
    objective:
      "Draft focused Reddit search queries that will surface discussions highlighting user sentiment, wins, gaps, and requested improvements for the product.",
    product,
    productHooks: {
      name: product.name,
      tagline: product.tagline,
      type: product.type,
      keywords: product.keywords,
      platforms: product.platforms,
    },
  }

  if (summary) {
    payload.summary = summary
    payload.summaryHighlights = {
      overview: summary.overview,
      valuePropositions: summary.valuePropositions,
      targetUsers: summary.targetUsers,
      keyFeatures: summary.keyFeatures,
      painPointsAddressed: summary.painPointsAddressed,
      toneAndStyle: summary.toneAndStyle,
    }
  }

  if (Array.isArray(subreddits) && subreddits.length) {
    payload.recommendedSubreddits = subreddits
      .slice(0, 10)
      .map((entry) => entry.name)
    payload.subredditProfiles = subreddits.slice(0, 10).map((entry) => ({
      name: entry.name,
      description: entry.description ?? entry.title ?? null,
      relevanceReason: entry.relevanceReason ?? null,
      matchedQueries: entry.matchedQueries ?? [],
    }))
  }

  console.info("[productIdeas:reddit] generating discussion query plan", {
    hasSummary: Boolean(summary),
    subredditCount: subreddits?.length ?? 0,
  })

  const response = await openai.responses.create({
    model: "gpt-4.1",
    temperature: 0.25,
    max_output_tokens: 850,
    text: {
      format: {
        type: "json_schema",
        name: "product_reddit_discussion_queries",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            queries: {
              type: "array",
              minItems: MIN_QUERIES,
              maxItems: MAX_QUERIES,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  query: { type: "string", minLength: 4 },
                  rationale: { type: ["string", "null"] },
                  targetSubreddit: { type: ["string", "null"] },
                },
                required: ["query", "rationale", "targetSubreddit"],
              },
            },
          },
          required: ["queries"],
        },
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are a growth researcher who crafts precise Reddit searches to mine user feedback. Return JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          ...payload,
          guidance: [
            "Prefer multi-keyword phrases tailored to workflows, jobs-to-be-done, or competitor comparisons.",
            "Include subreddit filters when a community is explicitly relevant.",
            "Mix positive, negative, and exploratory angles to capture what works and what fails.",
            "Avoid including the word 'reddit' or site filters in the query text.",
            "Blend ShipyardHQ (and variations like 'Shipyard HQ') with launch pains, analytics, pricing, or collaboration angles so the product is explicitly part of the search context.",
            "Ensure at least one distinct query is crafted for each provided subreddit that focuses on launches, growth, analytics, or indie maker workflows.",
            "Balance first-hand feedback (e.g., 'experience', 'review'), comparison/alternatives, and problem-oriented searches (e.g., 'pain points', 'pricing issues').",
          ],
        }),
      },
    ],
  } as any)

  const raw = extractAssistantJson(response)
  const jsonText = coerceJsonText(raw)
  const parsed = QueryPlanSchema.parse(
    safeParseJson(jsonText || "{}", "discussion_query_plan"),
  )

  const seen = new Set<string>()
  const queries: ProductIdeaRedditDiscussionQuery[] = []
  for (const entry of parsed.queries) {
    const queryText = entry.query.trim()
    if (!queryText) continue
    const normalizedKey = `${queryText.toLowerCase()}|${
      sanitizeOptionalText(entry.targetSubreddit)?.toLowerCase() ?? ""
    }`
    if (seen.has(normalizedKey)) continue
    seen.add(normalizedKey)
    queries.push({
      query: queryText,
      rationale: sanitizeOptionalText(entry.rationale),
      targetSubreddit: sanitizeOptionalText(entry.targetSubreddit),
    })
  }

  console.info("[productIdeas:reddit] discussion query plan ready", {
    queryCount: queries.length,
    sample: queries[0]?.query,
  })

  return {
    queries,
    model: "gpt-4.1-mini",
  }
}

type RedditListingChild = {
  data?: Record<string, any>
}

type RedditListing = {
  data?: {
    children?: RedditListingChild[]
  }
}

function normalizeThread(data: Record<string, any>): ProductIdeaRedditThread | null {
  if (!data || typeof data.id !== "string" || typeof data.permalink !== "string") {
    return null
  }

  if (data.over_18) {
    return null
  }

  const permalink: string = data.permalink
  const postUrl = `https://reddit.com${permalink}`
  const createdAt = typeof data.created_utc === "number"
    ? new Date(data.created_utc * 1000).toISOString()
    : undefined

  return {
    id: data.id,
    title: String(data.title ?? "").slice(0, 480),
    url: postUrl,
    permalink,
    subreddit: typeof data.subreddit === "string" ? data.subreddit : "",
    author: typeof data.author === "string" ? data.author : null,
    score: typeof data.score === "number" ? data.score : null,
    numComments:
      typeof data.num_comments === "number" ? data.num_comments : null,
    createdAt,
    flairText:
      typeof data.link_flair_text === "string"
        ? truncateText(data.link_flair_text, 120)
        : null,
    matchedQueries: [],
    topComments: [],
  }
}

async function searchRedditThreads(
  query: ProductIdeaRedditDiscussionQuery,
  accessToken: string,
): Promise<ProductIdeaRedditThread[]> {
  const targetSubreddit = query.targetSubreddit
    ? normalizeSubredditName(query.targetSubreddit)
    : null

  const url = targetSubreddit
    ? new URL(`https://oauth.reddit.com/r/${targetSubreddit}/search`)
    : new URL("https://oauth.reddit.com/search")

  url.searchParams.set("q", query.query)
  url.searchParams.set("limit", String(MAX_POSTS_PER_QUERY))
  url.searchParams.set("sort", "relevance")
  url.searchParams.set("t", "year")
  url.searchParams.set("type", "link")
  url.searchParams.set("include_over_18", "false")
  url.searchParams.set("show", "all")
  url.searchParams.set("sr_detail", "1")

  if (targetSubreddit) {
    url.searchParams.set("restrict_sr", "on")
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": REDDIT_USER_AGENT,
    },
  })

  if (response.status === 429) {
    throw new Error("Reddit API rate limit reached while searching discussions")
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Failed to search reddit discussions for query "${query.query}" (status ${response.status}): ${body}`,
    )
  }

  const json = (await response.json()) as RedditListing
  const children = json.data?.children ?? []

  const threads: ProductIdeaRedditThread[] = []

  for (const child of children) {
    if (!child?.data) continue
    const thread = normalizeThread(child.data)
    if (!thread) continue
    thread.matchedQueries = [query.query]
    if (query.targetSubreddit) {
      const normalized = normalizeSubredditName(query.targetSubreddit)
      thread.matchedQueries.push(`r/${normalized}`)
    }
    threads.push(thread)
  }

  return threads
}

async function fetchTopComments(
  postId: string,
  accessToken: string,
): Promise<ProductIdeaRedditComment[]> {
  const url = new URL(`https://oauth.reddit.com/comments/${postId}`)
  url.searchParams.set("limit", String(MAX_COMMENTS_PER_THREAD))
  url.searchParams.set("sort", "top")
  url.searchParams.set("depth", "1")

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": REDDIT_USER_AGENT,
    },
  })

  if (!response.ok) {
    return []
  }

  const json = (await response.json()) as Array<RedditListing>
  const commentsListing = Array.isArray(json) ? json[1] : undefined
  const commentChildren = commentsListing?.data?.children ?? []
  const comments: ProductIdeaRedditComment[] = []

  for (const child of commentChildren) {
    const data = child?.data
    if (!data || data.body === "[removed]" || data.body === "[deleted]") {
      continue
    }

    if (typeof data.id !== "string" || typeof data.body !== "string") {
      continue
    }

    comments.push({
      id: data.id,
      body: truncateText(data.body, 420) ?? "",
      author: typeof data.author === "string" ? data.author : null,
      score: typeof data.score === "number" ? data.score : null,
      createdAt:
        typeof data.created_utc === "number"
          ? new Date(data.created_utc * 1000).toISOString()
          : null,
    })

    if (comments.length >= MAX_COMMENTS_PER_THREAD) {
      break
    }
  }

  return comments
}

function mergeAndRankThreads(
  queryResults: Array<{
    query: ProductIdeaRedditDiscussionQuery
    threads: ProductIdeaRedditThread[]
  }>,
  preferredSubreddits?: Set<string>,
): ProductIdeaRedditThread[] {
  const map = new Map<
    string,
    ProductIdeaRedditThread & { score: number }
  >()

  for (const result of queryResults) {
    for (const thread of result.threads) {
      const existing = map.get(thread.id)
      const matchedQueries = new Set(existing?.matchedQueries ?? [])
      if (existing) {
        const aggregateScore =
          (existing.score ?? 0) +
          computeThreadScore(thread, preferredSubreddits)
        matchedQueries.add(result.query.query)
        map.set(thread.id, {
          ...existing,
          score: aggregateScore,
          matchedQueries: Array.from(matchedQueries),
        })
      } else {
        matchedQueries.add(result.query.query)
        map.set(thread.id, {
          ...thread,
          score: computeThreadScore(thread, preferredSubreddits),
          matchedQueries: Array.from(matchedQueries),
        })
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_TOTAL_THREADS)
}

function computeThreadScore(
  thread: ProductIdeaRedditThread,
  preferredSubreddits?: Set<string>,
) {
  const ups = thread.score ?? 0
  const comments = thread.numComments ?? 0
  const recencyBoost = (() => {
    if (!thread.createdAt) return 0
    const ageMs = Date.now() - new Date(thread.createdAt).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    if (!Number.isFinite(ageDays)) return 0
    if (ageDays <= 7) return 60
    if (ageDays <= 30) return 40
    if (ageDays <= 90) return 20
    if (ageDays <= 365) return 10
    return 0
  })()
  const preferredBoost = preferredSubreddits?.has(
    thread.subreddit.toLowerCase(),
  )
    ? 120
    : 0

  return ups + comments * 2 + recencyBoost + preferredBoost
}

const ThreadRelevanceSchema = z.object({
  threads: z
    .array(
      z.object({
        id: z.string(),
        keep: z.boolean(),
        relevance: z.number().min(0).max(1),
        rationale: z.string().min(3),
      }),
    )
    .min(1),
})

async function filterThreadsByRelevance({
  product,
  summary,
  subreddits,
  threads,
  preferredSubreddits,
}: {
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  subreddits?: ProductIdeaSubreddit[] | null
  threads: ProductIdeaRedditThread[]
  preferredSubreddits?: Set<string>
}): Promise<ProductIdeaRedditThread[]> {
  if (!threads.length) return []

  const eligibleThreads = threads.filter((thread) => {
    const commentCount = thread.numComments ?? 0
    const harvestedComments = thread.topComments?.length ?? 0
    return commentCount > 0 || harvestedComments > 0
  })

  if (!eligibleThreads.length) {
    return []
  }

  const openai = getOpenAIClient()
  const sampleThreads = eligibleThreads.slice(0, 18).map((thread) => ({
    id: thread.id,
    title: thread.title,
    subreddit: thread.subreddit,
    matchedQueries: thread.matchedQueries ?? [],
    score: thread.score ?? null,
    numComments: thread.numComments ?? null,
    topComment:
      thread.topComments && thread.topComments.length
        ? thread.topComments[0]?.body ?? null
        : null,
  }))

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.15,
      max_output_tokens: 800,
      text: {
        format: {
          type: "json_schema",
          name: "product_reddit_thread_screen",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              threads: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    keep: { type: "boolean" },
                    relevance: { type: "number", minimum: 0, maximum: 1 },
                    rationale: { type: "string", minLength: 3 },
                  },
                  required: ["id", "keep", "relevance", "rationale"],
                },
              },
            },
            required: ["threads"],
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are validating whether Reddit threads are directly useful for product launch insights. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            objective:
              "Keep only threads that give meaningful signals about this product, comparable launch platforms, or the launch pains it solves.",
            context: {
              product,
              summary,
              subreddits,
              threads: sampleThreads,
            },
            keepGuidelines: [
              "Keep threads that mention the product, similar launch platforms, product hunt launches, or launch workflows relevant to the described audience.",
              "Drop threads that are clearly unrelated (gaming updates, unrelated consumer products, personal stories).",
              "Favor discussions from the curated subreddits or threads that match the generated queries.",
            ],
          }),
        },
      ],
    } as any)

    const raw = extractAssistantJson(response)
    const jsonText = coerceJsonText(raw)
    const parsed = ThreadRelevanceSchema.parse(
      safeParseJson(jsonText || "{}", "thread_relevance"),
    )

    const evaluation = new Map(
      parsed.threads.map((entry) => [entry.id, entry]),
    )

    const MIN_KEEP_SCORE = 0.45

    let curated = eligibleThreads.filter((thread) => {
      const verdict = evaluation.get(thread.id)
      if (!verdict) return false
      return verdict.keep && verdict.relevance >= MIN_KEEP_SCORE
    })

    if (preferredSubreddits?.size) {
      const preferredCurated = curated.filter((thread) =>
        preferredSubreddits.has(thread.subreddit.toLowerCase()),
      )
      if (preferredCurated.length) {
        curated = preferredCurated
      }
    }

    if (!curated.length) {
      curated = eligibleThreads.filter((thread) => {
        const verdict = evaluation.get(thread.id)
        return verdict?.keep
      })
    }

    if (!curated.length) {
      curated = eligibleThreads.slice(0, Math.min(6, eligibleThreads.length))
    }

    return curated
  } catch (error) {
    console.error("[productIdeas:reddit] thread relevance screening failed", {
      error,
    })
    return eligibleThreads.slice(0, Math.min(10, eligibleThreads.length))
  }
}

async function synthesizeInsights({
  product,
  summary,
  subreddits,
  threads,
}: {
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  subreddits?: ProductIdeaSubreddit[] | null
  threads: ProductIdeaRedditThread[]
}): Promise<{ insights: ProductIdeaRedditInsightReport; model: string } | null> {
  if (!threads.length) {
    return null
  }

  const openai = getOpenAIClient()

  const trimmedThreads = threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    subreddit: thread.subreddit,
    score: thread.score,
    numComments: thread.numComments,
    createdAt: thread.createdAt,
    flairText: thread.flairText,
    matchedQueries: thread.matchedQueries,
    topComments: (thread.topComments ?? []).map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.author,
      score: comment.score,
    })),
  }))

  const payload: Record<string, unknown> = {
    product,
    summary,
    subreddits: subreddits?.map((entry) => ({
      name: entry.name,
      relevance: entry.relevanceReason,
    })),
    threads: trimmedThreads,
  }

  console.info("[productIdeas:reddit] synthesizing discussion insights", {
    threadCount: threads.length,
  })

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      max_output_tokens: 1100,
      text: {
        format: {
          type: "json_schema",
          name: "product_reddit_discussion_insights",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              sections: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    description: { type: ["string", "null"] },
                    items: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          insight: { type: "string" },
                          sentiment: {
                            type: ["string", "null"],
                            enum: ["positive", "negative", "neutral", null],
                          },
                          audience: { type: ["string", "null"] },
                          evidence: {
                            type: ["array", "null"],
                            items: { type: "string" },
                          },
                          references: {
                            type: ["array", "null"],
                            items: { type: "string" },
                          },
                        },
                        required: [
                          "insight",
                          "sentiment",
                          "audience",
                          "evidence",
                          "references",
                        ],
                      },
                    },
                  },
                  required: ["title", "description", "items"],
                },
              },
              recommendedFocus: {
                type: ["array", "null"],
                items: { type: "string" },
              },
            },
            required: ["summary", "sections", "recommendedFocus"],
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a product strategist distilling Reddit discussions into actionable guidance. Output JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            objective:
              "Identify what users celebrate, struggle with, and request regarding the product or adjacent solutions.",
            expectations: [
              "Group findings into focused sections (e.g., What's Working, Pain Points, Opportunities, Alternatives).",
              "Each insight should reference at least one supporting thread or comment ID in references.",
              "Capture both positive signals and unresolved frustrations.",
              "Include recommended focus areas summarizing the most urgent priorities.",
            ],
            context: payload,
          }),
        },
      ],
    } as any)

    const raw = extractAssistantJson(response)
    const jsonText = coerceJsonText(raw)
    const parsed = InsightReportSchema.parse(
      safeParseJson(jsonText || "{}", "discussion_insights"),
    )

    return {
      insights: parsed,
      model: "gpt-4.1-mini",
    }
  } catch (error) {
    console.error("[productIdeas:reddit] insight synthesis failed", {
      error,
    })
    return null
  }
}

export type DiscoverProductDiscussionsInput = {
  productId: string
  product: ProductIdeaProductContext
  summary?: ProductIdeaSummary | null
  subreddits?: ProductIdeaSubreddit[] | null
  forceRefresh?: boolean
}

export type DiscoverProductDiscussionsResult = {
  queries: ProductIdeaRedditDiscussionQuery[]
  threads: ProductIdeaRedditThread[]
  insights: ProductIdeaRedditInsightReport | null
  model: string
  fromCache: boolean
}

export async function discoverProductDiscussions(
  input: DiscoverProductDiscussionsInput,
): Promise<DiscoverProductDiscussionsResult> {
  const { productId, product, summary, subreddits, forceRefresh } = input

  const redis = await getRedisClient().catch(() => null)
  const cacheKey = buildCacheKey(productId)

  if (redis && !forceRefresh) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      try {
        const parsed = CacheSchema.parse(JSON.parse(cached))
        console.info("[productIdeas:reddit] discussion cache hit", {
          productId,
          threadCount: parsed.threads.length,
        })
        return {
          queries: parsed.queries,
          threads: parsed.threads,
          insights: parsed.insights,
          model: parsed.model,
          fromCache: true,
        }
      } catch (error) {
        console.warn(
          "[productIdeas:reddit] failed to parse cached discussions",
          {
            productId,
            error,
          },
        )
      }
    }
  }

  const accessToken = await getRedditAccessToken()

  const { queries, model: queryModel } = await generateDiscussionQueries({
    product,
    summary,
    subreddits,
  })

  const preferredSubredditSet = new Set(
    (subreddits ?? []).map((entry) => entry.name.toLowerCase()),
  )

  const augmentedQueries: ProductIdeaRedditDiscussionQuery[] = [...queries]

  if (preferredSubredditSet.size) {
    const normalizedExistingTargets = new Set(
      queries
        .map((item) =>
          item.targetSubreddit
            ? normalizeSubredditName(item.targetSubreddit)
            : null,
        )
        .filter((value): value is string => Boolean(value)),
    )

    for (const subreddit of (subreddits ?? []).slice(0, 5)) {
      const normalized = subreddit.name?.toLowerCase()
      if (!normalized || normalizedExistingTargets.has(normalized)) {
        continue
      }
      augmentedQueries.push(
        buildFallbackSubredditQuery({
          product,
          summary,
          subredditName: subreddit.name,
        }),
      )
      normalizedExistingTargets.add(normalized)
    }

    if (augmentedQueries.length > queries.length) {
      console.info("[productIdeas:reddit] added fallback subreddit queries", {
        productId,
        added: augmentedQueries.length - queries.length,
      })
    }
  }

  const queryResults: Array<{
    query: ProductIdeaRedditDiscussionQuery
    threads: ProductIdeaRedditThread[]
  }> = []

  for (const query of augmentedQueries) {
    console.info("[productIdeas:reddit] searching discussions", {
      productId,
      query: query.query,
      targetSubreddit: query.targetSubreddit,
    })

    try {
      const threads = await searchRedditThreads(query, accessToken)
      queryResults.push({ query, threads })
    } catch (error) {
      console.error("[productIdeas:reddit] discussion search failed", {
        productId,
        query: query.query,
        error,
      })
    }
  }

  let mergedThreads = mergeAndRankThreads(queryResults, preferredSubredditSet)

  if (preferredSubredditSet.size) {
    const preferredThreads = mergedThreads.filter((thread) =>
      preferredSubredditSet.has(thread.subreddit.toLowerCase()),
    )
    const otherThreads = mergedThreads.filter(
      (thread) => !preferredSubredditSet.has(thread.subreddit.toLowerCase()),
    )
    if (preferredThreads.length) {
      const limit = mergedThreads.length
      mergedThreads = [...preferredThreads, ...otherThreads].slice(0, limit)
    }
  }

  const commentFetchTargets = mergedThreads.slice(0, 6)

  await Promise.all(
    commentFetchTargets.map(async (thread) => {
      try {
        const comments = await fetchTopComments(thread.id, accessToken)
        thread.topComments = comments.length ? comments : null
      } catch (error) {
        console.warn("[productIdeas:reddit] failed to fetch top comments", {
          productId,
          threadId: thread.id,
          error,
        })
      }
    }),
  )

  mergedThreads = mergedThreads.map((thread) => ({
    ...thread,
    matchedQueries: Array.isArray(thread.matchedQueries)
      ? Array.from(new Set(thread.matchedQueries))
      : null,
  }))

  mergedThreads = mergedThreads.filter((thread) => {
    const commentCount = thread.numComments ?? 0
    const harvestedComments = thread.topComments?.length ?? 0
    return commentCount > 0 || harvestedComments > 0
  })

  const curatedThreads = await filterThreadsByRelevance({
    product,
    summary,
    subreddits,
    threads: mergedThreads,
    preferredSubreddits: preferredSubredditSet,
  })

  let finalThreads = curatedThreads
  if (!finalThreads.length && preferredSubredditSet.size) {
    const preferredFallback = mergedThreads.filter((thread) =>
      preferredSubredditSet.has(thread.subreddit.toLowerCase()),
    )
    if (preferredFallback.length) {
      finalThreads = preferredFallback.slice(
        0,
        Math.min(8, preferredFallback.length),
      )
    }
  }

  if (!finalThreads.length) {
    finalThreads = mergedThreads.slice(0, Math.min(8, mergedThreads.length))
  }

  const insightResult = await synthesizeInsights({
    product,
    summary,
    subreddits,
    threads: finalThreads,
  })

  const insightModel = insightResult?.model
  const insights = insightResult?.insights ?? null

  const combinedModel = insightModel
    ? `${queryModel} → ${insightModel}`
    : queryModel

  console.info("[productIdeas:reddit] discussion discovery completed", {
    productId,
    queryCount: augmentedQueries.length,
    threadCount: finalThreads.length,
    hasInsights: Boolean(insights),
  })

  if (redis && finalThreads.length) {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify({
          queries: augmentedQueries,
          threads: finalThreads,
          insights,
          model: combinedModel,
        }),
        { EX: REDDIT_DISCUSSION_CACHE_TTL_SECONDS },
      )
    } catch (error) {
      console.warn("[productIdeas:reddit] failed to cache discussions", {
        productId,
        error,
      })
    }
  }

  return {
    queries: augmentedQueries,
    threads: finalThreads,
    insights,
    model: combinedModel,
    fromCache: false,
  }
}
