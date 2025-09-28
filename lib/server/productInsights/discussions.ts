import { jsonrepair } from "jsonrepair"
import { z } from "zod"

import type {
  ProductInsightRedditComment,
  ProductInsightRedditDiscussionQuery,
  ProductInsightRedditInsightReport,
  ProductInsightRedditThread,
  ProductInsightHarvestMode,
  ProductInsightSubreddit,
} from "@/types/product-insights"
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
import {
  getRedditAccessToken,
  getRedditUserAgent,
} from "./redditClient"
import {
  getProductInsightDiscussionInsightModel,
  getProductInsightDiscussionQueryModel,
} from "./config"

const REDDIT_USER_AGENT = getRedditUserAgent()
function resolveCacheNamespace(base: string) {
  const prefix =
    process.env.REDIS_ENV_NAMESPACE?.trim() || process.env.NODE_ENV?.trim()
  return prefix ? `${prefix}:${base}` : base
}

const REDDIT_DISCUSSION_CACHE_NAMESPACE = resolveCacheNamespace(
  "productInsights:redditDiscussions:v2",
)
const REDDIT_DISCUSSION_CACHE_TTL_SECONDS = 60 * 60 * 3
const MAX_QUERIES = 6
const MIN_QUERIES = 2
const STANDARD_MAX_POSTS_PER_QUERY = 10
const DEEP_MAX_POSTS_PER_QUERY = 25
type RedditSearchTimeWindow = "hour" | "day" | "week" | "month" | "year" | "all"
const STANDARD_SEARCH_TIME_WINDOW: RedditSearchTimeWindow = "year"
const DEEP_SEARCH_TIME_WINDOW: RedditSearchTimeWindow = "all"
const MAX_TOTAL_THREADS = 18
const STANDARD_MAX_COMMENTS_PER_THREAD = 3
const DEEP_MAX_COMMENTS_PER_THREAD = 120
const DEEP_FULL_TREE_THREAD_LIMIT = 3
const DEEP_TOP_LEVEL_COMMENT_LIMIT = 100

const DEFAULT_HARVEST_MODE: ProductInsightHarvestMode = "standard"

const HarvestModeSchema = z.enum(["standard", "deep"])

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
  parentId: z.string().optional().nullable(),
  depth: z.number().optional().nullable(),
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
  mode: HarvestModeSchema.optional(),
})

function buildCacheKey(productId: string, mode: ProductInsightHarvestMode) {
  return `${REDDIT_DISCUSSION_CACHE_NAMESPACE}:${productId}:${mode}`
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
  } catch (primaryError) {
    const sanitized = text
      .replace(/,(?=\s*[}\]])/g, "")
      .replace(/\uFEFF/g, "")

    try {
      return attempt(sanitized)
    } catch (secondaryError) {
      const attempts = [text, sanitized].filter(
        (candidate, index, self) =>
          typeof candidate === "string" && self.indexOf(candidate) === index,
      )

      const repairErrors: string[] = []

      for (const candidate of attempts) {
        try {
          const repaired = jsonrepair(candidate)
          return attempt(repaired)
        } catch (error) {
          repairErrors.push(`${error}`)
        }
      }

      console.error("[productInsights:reddit] failed to parse model JSON", {
        context,
        original: text?.slice(0, 2000),
        error: secondaryError,
        previousErrors: [primaryError, ...repairErrors].map((error) => `${error}`),
      })
      throw secondaryError
    }
  }
}

function buildFallbackSubredditQuery({
  product,
  summary,
  subredditName,
}: {
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  subredditName: string
}): ProductInsightRedditDiscussionQuery | null {
  const productName = sanitizeOptionalText(product.name)
  if (!productName) {
    return null
  }

  const candidates: string[] = []
  candidates.push(productName)
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

  const modifiers = unique
    .filter((value) => value.toLowerCase() !== productName.toLowerCase())
    .slice(0, 2)
  const base = [`"${productName}"`, ...modifiers].join(" ") || `"${productName}"`
  const query = `${base} feedback`

  return {
    query,
    rationale: `Ensure r/${subredditName} is queried directly for recent feedback conversations.`,
    targetSubreddit: subredditName,
  }
}

type GenerateDiscussionQueriesInput = {
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  subreddits?: ProductInsightSubreddit[] | null
}

async function generateDiscussionQueries(
  input: GenerateDiscussionQueriesInput,
): Promise<{
  queries: ProductInsightRedditDiscussionQuery[]
  model: string
}> {
  const { product, summary, subreddits } = input
  const openai = getOpenAIClient()
  const productName = sanitizeOptionalText(product.name)
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
    payload.existingCapabilities = summary.keyFeatures ?? []
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

  const guidance: string[] = [
    "Prefer multi-keyword phrases tailored to workflows, jobs-to-be-done, or competitor comparisons.",
    "Include subreddit filters when a community is explicitly relevant.",
    "Mix positive, negative, and exploratory angles to capture what works and what fails.",
    "Avoid including the word 'reddit' or site filters in the query text.",
    productName
      ? `Blend ${productName} (and near variations of its brand name) with launch pains, analytics, pricing, or collaboration angles so the product is explicit in the search context.`
      : "Blend the product's name with launch pains, analytics, pricing, or collaboration angles so the product stays explicit in the search context.",
    "Ensure at least one distinct query is crafted for each provided subreddit that focuses on launches, growth, analytics, or indie maker workflows.",
    "Balance first-hand feedback (e.g., 'experience', 'review'), comparison/alternatives, and problem-oriented searches (e.g., 'pain points', 'pricing issues').",
    "Prioritize searches that surface unmet needs, enhancement ideas, or reformulations rather than reiterating existing capabilities listed in existingCapabilities.",
  ]

  console.info("[productInsights:reddit] generating discussion query plan", {
    hasSummary: Boolean(summary),
    subredditCount: subreddits?.length ?? 0,
  })

  const queryModel = getProductInsightDiscussionQueryModel()

  const response = await openai.responses.create({
    model: queryModel,
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
          guidance,
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
  const queries: ProductInsightRedditDiscussionQuery[] = []
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

  console.info("[productInsights:reddit] discussion query plan ready", {
    queryCount: queries.length,
    sample: queries[0]?.query,
  })

  return {
    queries,
    model: queryModel,
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

function normalizeThread(data: Record<string, any>): ProductInsightRedditThread | null {
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

type SearchThreadsOptions = {
  maxPosts?: number
  timeWindow?: RedditSearchTimeWindow
}

async function searchRedditThreads(
  query: ProductInsightRedditDiscussionQuery,
  accessToken: string,
  options: SearchThreadsOptions = {},
): Promise<ProductInsightRedditThread[]> {
  const targetSubreddit = query.targetSubreddit
    ? normalizeSubredditName(query.targetSubreddit)
    : null

  const url = targetSubreddit
    ? new URL(`https://oauth.reddit.com/r/${targetSubreddit}/search`)
    : new URL("https://oauth.reddit.com/search")

  url.searchParams.set("q", query.query)
  const requestedLimit = options.maxPosts ?? STANDARD_MAX_POSTS_PER_QUERY
  const normalizedLimit = Math.max(
    1,
    Math.min(Math.floor(requestedLimit), 100),
  )
  url.searchParams.set("limit", String(normalizedLimit))
  url.searchParams.set("sort", "relevance")
  const timeWindow = options.timeWindow ?? STANDARD_SEARCH_TIME_WINDOW
  url.searchParams.set("t", timeWindow)
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

  const threads: ProductInsightRedditThread[] = []

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

type FetchThreadCommentsOptions = {
  topLevelLimit?: number
  maxComments?: number
  depth?: number | "all"
}

async function fetchThreadComments(
  postId: string,
  accessToken: string,
  options: FetchThreadCommentsOptions = {},
): Promise<ProductInsightRedditComment[]> {
  const url = new URL(`https://oauth.reddit.com/comments/${postId}`)
  const requestedLimit = options.topLevelLimit ?? STANDARD_MAX_COMMENTS_PER_THREAD
  const normalizedLimit = Math.max(
    1,
    Math.min(Math.floor(requestedLimit), 200),
  )
  url.searchParams.set("limit", String(normalizedLimit))
  url.searchParams.set("sort", "top")
  const normalizedDepth =
    options.depth === "all"
      ? 0
      : Math.max(1, Math.min(10, Math.floor(options.depth ?? 1)))
  url.searchParams.set("depth", String(normalizedDepth))

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
  const commentChildren = commentsListing?.data?.children as
    | RedditListingChild[]
    | undefined
  const comments: ProductInsightRedditComment[] = []
  const visited = new Set<string>()
  const maxComments = Math.max(
    1,
    Math.floor(options.maxComments ?? normalizedLimit),
  )
  const depthLimit =
    options.depth === "all" || normalizedDepth === 0
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Math.floor(options.depth ?? 1))

  const collectComments = (
    children: RedditListingChild[] | undefined,
    currentDepth: number,
  ): boolean => {
    if (!children?.length) return false

    for (const child of children) {
      if (!child || child.kind !== "t1" || !child.data) continue
      const data = child.data
      if (data.body === "[removed]" || data.body === "[deleted]") {
        continue
      }
      if (typeof data.id !== "string" || typeof data.body !== "string") {
        continue
      }
      if (visited.has(data.id)) {
        continue
      }

      const createdAt =
        typeof data.created_utc === "number"
          ? new Date(data.created_utc * 1000).toISOString()
          : null

      comments.push({
        id: data.id,
        body: truncateText(data.body, 420) ?? "",
        author: typeof data.author === "string" ? data.author : null,
        score: typeof data.score === "number" ? data.score : null,
        createdAt,
        parentId:
          typeof data.parent_id === "string" ? data.parent_id : null,
        depth:
          typeof data.depth === "number"
            ? data.depth
            : Math.max(0, currentDepth - 1),
      })
      visited.add(data.id)

      if (comments.length >= maxComments) {
        return true
      }

      if (currentDepth < depthLimit) {
        const replies = data.replies
        if (replies && typeof replies === "object") {
          const replyChildren = Array.isArray(replies.data?.children)
            ? (replies.data!.children as RedditListingChild[])
            : undefined
          const reachedLimit = collectComments(
            replyChildren,
            currentDepth + 1,
          )
          if (reachedLimit) {
            return true
          }
        }
      }
    }

    return false
  }

  collectComments(commentChildren, 1)

  return comments
}

function mergeAndRankThreads(
  queryResults: Array<{
    query: ProductInsightRedditDiscussionQuery
    threads: ProductInsightRedditThread[]
  }>,
  preferredSubreddits?: Set<string>,
): ProductInsightRedditThread[] {
  const map = new Map<
    string,
    ProductInsightRedditThread & { score: number }
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
  thread: ProductInsightRedditThread,
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
        rationale: z.string().min(3).optional().nullable(),
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
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  subreddits?: ProductInsightSubreddit[] | null
  threads: ProductInsightRedditThread[]
  preferredSubreddits?: Set<string>
}): Promise<ProductInsightRedditThread[]> {
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
  const insightModel = getProductInsightDiscussionInsightModel()
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
      model: insightModel,
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
              existingCapabilities: summary?.keyFeatures ?? [],
            },
            keepGuidelines: [
              "Keep threads that mention the product, similar launch platforms, product hunt launches, or launch workflows relevant to the described audience.",
              "Drop threads that are clearly unrelated (gaming updates, unrelated consumer products, personal stories).",
              "Favor discussions from the curated subreddits or threads that match the generated queries.",
              "Prioritize posts where users share friction, unmet needs, or enhancement requests over those merely praising existing capabilities.",
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
    console.error("[productInsights:reddit] thread relevance screening failed", {
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
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  subreddits?: ProductInsightSubreddit[] | null
  threads: ProductInsightRedditThread[]
}): Promise<{ insights: ProductInsightRedditInsightReport; model: string } | null> {
  if (!threads.length) {
    return null
  }

  const openai = getOpenAIClient()
  const insightModel = getProductInsightDiscussionInsightModel()

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

  if (summary?.keyFeatures?.length) {
    payload.existingCapabilities = summary.keyFeatures
  }

  console.info("[productInsights:reddit] synthesizing discussion insights", {
    threadCount: threads.length,
  })

  try {
    const response = await openai.responses.create({
      model: insightModel,
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
              "Emphasize improvements, enhancements, or unresolved needs rather than restating existing capabilities unless you propose how to extend them.",
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
      model: insightModel,
    }
  } catch (error) {
    console.error("[productInsights:reddit] insight synthesis failed", {
      error,
    })
    return null
  }
}

export type DiscoverProductDiscussionsInput = {
  productId: string
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  subreddits?: ProductInsightSubreddit[] | null
  forceRefresh?: boolean
  mode?: ProductInsightHarvestMode
}

export type DiscoverProductDiscussionsResult = {
  queries: ProductInsightRedditDiscussionQuery[]
  threads: ProductInsightRedditThread[]
  insights: ProductInsightRedditInsightReport | null
  model: string
  fromCache: boolean
  mode: ProductInsightHarvestMode
}

export async function discoverProductDiscussions(
  input: DiscoverProductDiscussionsInput,
): Promise<DiscoverProductDiscussionsResult> {
  const {
    productId,
    product,
    summary,
    subreddits,
    forceRefresh,
    mode = DEFAULT_HARVEST_MODE,
  } = input

  const redis = await getRedisClient().catch(() => null)
  const cacheKey = buildCacheKey(productId, mode)

  if (redis && !forceRefresh) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      try {
        const parsed = CacheSchema.parse(JSON.parse(cached))
        const cachedMode = parsed.mode ?? DEFAULT_HARVEST_MODE
        console.info("[productInsights:reddit] discussion cache hit", {
          productId,
          threadCount: parsed.threads.length,
        })
        return {
          queries: parsed.queries,
          threads: parsed.threads,
          insights: parsed.insights,
          model: parsed.model,
          fromCache: true,
          mode: cachedMode,
        }
      } catch (error) {
        console.warn(
          "[productInsights:reddit] failed to parse cached discussions",
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

  const augmentedQueries: ProductInsightRedditDiscussionQuery[] = [...queries]

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
      const fallbackQuery = buildFallbackSubredditQuery({
        product,
        summary,
        subredditName: subreddit.name,
      })
      if (!fallbackQuery) {
        continue
      }
      augmentedQueries.push(fallbackQuery)
      normalizedExistingTargets.add(normalized)
    }

    if (augmentedQueries.length > queries.length) {
      console.info("[productInsights:reddit] added fallback subreddit queries", {
        productId,
        added: augmentedQueries.length - queries.length,
      })
    }
  }

  const queryResults: Array<{
    query: ProductInsightRedditDiscussionQuery
    threads: ProductInsightRedditThread[]
  }> = []

  const runSearchPass = async (
    pass: "standard" | "deep",
    options: SearchThreadsOptions,
  ) => {
    for (const query of augmentedQueries) {
      const logLabel =
        pass === "deep"
          ? "[productInsights:reddit] searching discussions (deep)"
          : "[productInsights:reddit] searching discussions"

      console.info(logLabel, {
        productId,
        query: query.query,
        targetSubreddit: query.targetSubreddit,
        pass,
      })

      try {
        const threads = await searchRedditThreads(query, accessToken, options)
        if (threads.length) {
          queryResults.push({ query, threads })
        }
      } catch (error) {
        const errorLabel =
          pass === "deep"
            ? "[productInsights:reddit] deep discussion search failed"
            : "[productInsights:reddit] discussion search failed"
        console.error(errorLabel, {
          productId,
          query: query.query,
          error,
        })
      }
    }
  }

  await runSearchPass("standard", {
    maxPosts: STANDARD_MAX_POSTS_PER_QUERY,
    timeWindow: STANDARD_SEARCH_TIME_WINDOW,
  })

  if (mode === "deep") {
    await runSearchPass("deep", {
      maxPosts: DEEP_MAX_POSTS_PER_QUERY,
      timeWindow: DEEP_SEARCH_TIME_WINDOW,
    })
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

  const commentFetchTargets = mergedThreads.slice(0, mode === "deep" ? 8 : 6)

  await Promise.all(
    commentFetchTargets.map(async (thread, index) => {
      const useFullTree =
        mode === "deep" && index < DEEP_FULL_TREE_THREAD_LIMIT
      try {
        const comments = await fetchThreadComments(thread.id, accessToken, {
          topLevelLimit: useFullTree
            ? DEEP_TOP_LEVEL_COMMENT_LIMIT
            : STANDARD_MAX_COMMENTS_PER_THREAD,
          depth: useFullTree ? "all" : 1,
          maxComments: useFullTree
            ? DEEP_MAX_COMMENTS_PER_THREAD
            : STANDARD_MAX_COMMENTS_PER_THREAD,
        })
        thread.topComments = comments.length ? comments : null
      } catch (error) {
        console.warn("[productInsights:reddit] failed to fetch top comments", {
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

  console.info("[productInsights:reddit] discussion discovery completed", {
    productId,
    queryCount: augmentedQueries.length,
    threadCount: finalThreads.length,
    hasInsights: Boolean(insights),
    mode,
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
          mode,
        }),
        { EX: REDDIT_DISCUSSION_CACHE_TTL_SECONDS },
      )
    } catch (error) {
      console.warn("[productInsights:reddit] failed to cache discussions", {
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
    mode,
  }
}
