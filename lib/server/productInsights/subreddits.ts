import { z } from "zod"

import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"
import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"
import { getRedisClient } from "@/lib/server/redis"
import type {
  ProductInsightSubreddit,
  ProductInsightSubredditQuery,
} from "@/types/product-insights"
import { getRedditAccessToken, getRedditUserAgent } from "./redditClient"
import {
  getProductInsightSubredditModel,
  getProductInsightSubredditRelevanceModel,
} from "./config"

const REDDIT_CACHE_TTL_SECONDS = 60 * 60 * 6 // 6 hours

function resolveCacheNamespace(base: string) {
  const prefix =
    process.env.REDIS_ENV_NAMESPACE?.trim() || process.env.NODE_ENV?.trim()
  return prefix ? `${prefix}:${base}` : base
}

const REDDIT_CACHE_NAMESPACE = resolveCacheNamespace(
  "productInsights:subreddits:v1",
)
const REDDIT_USER_AGENT = getRedditUserAgent()

const QueryResponseSchema = z.object({
  queries: z
    .array(
      z.object({
        query: z.string().min(4),
        rationale: z.string().optional().nullable(),
        audience: z.string().optional().nullable(),
      }),
    )
    .min(2)
    .max(6),
})

const SubredditSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  url: z.string(),
  iconUrl: z.string().optional().nullable(),
  subscribers: z.number().optional().nullable(),
  activeUserCount: z.number().optional().nullable(),
  over18: z.boolean().optional().nullable(),
  primaryTopic: z.string().optional().nullable(),
  score: z.number().optional().nullable(),
  matchedQueries: z.array(z.string()).optional().nullable(),
  relevanceScore: z.number().optional().nullable(),
  relevanceReason: z.string().optional().nullable(),
})

const DiscoverResultSchema = z.object({
  queries: z.array(
    z.object({
      query: z.string(),
      rationale: z.string().optional().nullable(),
      audience: z.string().optional().nullable(),
    }),
  ),
  subreddits: z.array(SubredditSchema),
  model: z.string(),
  queryCoverage: z.number().optional().nullable(),
  matchedQueryCount: z.number().optional().nullable(),
})

const RelevanceResponseSchema = z.object({
  subreddits: z
    .array(
      z.object({
        name: z.string(),
        keep: z.boolean(),
        relevance: z.number().min(0).max(1),
        rationale: z.string().min(1),
      }),
    )
    .min(1),
})

const MIN_RELEVANCE_SCORE = 0.35
const MIN_QUERY_MATCH_COVERAGE = 0.7

type NormalizedQueryIndex = Map<string, { original: string; indices: number[] }>

function normalizeQueryKey(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.toLowerCase()
  return normalized.length ? normalized : null
}

function indexQueries(
  queries: ProductInsightSubredditQuery[],
): NormalizedQueryIndex {
  const map: NormalizedQueryIndex = new Map()
  queries.forEach((entry, index) => {
    const key = normalizeQueryKey(entry?.query)
    if (!key) return
    const existing = map.get(key)
    if (existing) {
      existing.indices.push(index)
    } else {
      map.set(key, { original: entry.query.trim(), indices: [index] })
    }
  })
  return map
}

function computeCoverage(
  queriesByKey: NormalizedQueryIndex,
  subreddits: ProductInsightSubreddit[],
): {
  coverage: number
  matchedCount: number
  matchedKeys: Set<string>
  totalQueries: number
} {
  const matchedKeys = new Set<string>()

  for (const subreddit of subreddits) {
    if (!Array.isArray(subreddit.matchedQueries)) continue
    for (const raw of subreddit.matchedQueries) {
      const key = normalizeQueryKey(raw)
      if (key && queriesByKey.has(key)) {
        matchedKeys.add(key)
      }
    }
  }

  let matchedCount = 0
  let totalQueries = 0
  for (const [key, descriptor] of queriesByKey.entries()) {
    totalQueries += descriptor.indices.length
    if (matchedKeys.has(key)) {
      matchedCount += descriptor.indices.length
    }
  }

  const coverage = totalQueries > 0 ? matchedCount / totalQueries : 1
  return { coverage, matchedCount, matchedKeys, totalQueries }
}

function coverageFallbackReason(labels: string[]) {
  if (!labels.length) return "Coverage fallback"
  if (labels.length === 1) {
    return `Coverage fallback for "${labels[0]}"`
  }
  const formatted = labels
    .slice(0, 3)
    .map((label) => `"${label}"`)
    .join(", ")
  const extra = labels.length > 3 ? " and others" : ""
  return `Coverage fallback for ${formatted}${extra}`
}

function sortScore(subreddit: ProductInsightSubreddit): number {
  return (
    subreddit.relevanceScore ?? subreddit.score ?? subreddit.subscribers ?? 0
  )
}

function boostCoverage({
  queries,
  selected,
  fallbackPool,
  minimumCoverage,
}: {
  queries: ProductInsightSubredditQuery[]
  selected: ProductInsightSubreddit[]
  fallbackPool: ProductInsightSubreddit[]
  minimumCoverage: number
}): {
  subreddits: ProductInsightSubreddit[]
  coverage: number
  matchedCount: number
} {
  if (!queries.length) {
    const deduped = dedupeSubreddits(selected)
    return { subreddits: deduped, coverage: 1, matchedCount: 0 }
  }

  const queriesByKey = indexQueries(queries)
  const baseList = dedupeSubreddits(selected)
  const baseStats = computeCoverage(queriesByKey, baseList)

  if (baseStats.coverage >= minimumCoverage) {
    return {
      subreddits: baseList,
      coverage: baseStats.coverage,
      matchedCount: baseStats.matchedCount,
    }
  }

  const existingNames = new Set(
    baseList
      .map((entry) => entry.name?.toLowerCase())
      .filter((value): value is string => Boolean(value)),
  )

  const unmatchedKeys = new Set<string>()
  for (const key of queriesByKey.keys()) {
    if (!baseStats.matchedKeys.has(key)) {
      unmatchedKeys.add(key)
    }
  }

  const additions: ProductInsightSubreddit[] = []

  const fallbackCandidates = fallbackPool
    .filter((candidate) => {
      const nameKey = candidate.name?.toLowerCase()
      if (!nameKey || existingNames.has(nameKey)) return false
      return true
    })
    .map((candidate) => {
      const keys = new Set<string>()
      if (Array.isArray(candidate.matchedQueries)) {
        for (const raw of candidate.matchedQueries) {
          const key = normalizeQueryKey(raw)
          if (key && queriesByKey.has(key)) {
            keys.add(key)
          }
        }
      }
      return {
        candidate,
        keys,
        score: sortScore(candidate),
      }
    })
    .filter((entry) => entry.keys.size > 0)

  while (unmatchedKeys.size && fallbackCandidates.length) {
    let bestIndex = -1
    let bestScore = -Infinity
    let bestKeys: Set<string> | null = null

    for (let index = 0; index < fallbackCandidates.length; index += 1) {
      const entry = fallbackCandidates[index]
      const coverageKeys = new Set<string>()
      entry.keys.forEach((key) => {
        if (unmatchedKeys.has(key)) {
          coverageKeys.add(key)
        }
      })
      if (!coverageKeys.size) continue
      const candidateScore = coverageKeys.size * 1000 + entry.score
      if (candidateScore > bestScore) {
        bestScore = candidateScore
        bestIndex = index
        bestKeys = coverageKeys
      }
    }

    if (bestIndex === -1 || !bestKeys?.size) {
      break
    }

    const { candidate } = fallbackCandidates.splice(bestIndex, 1)[0]!
    const noteLabels = Array.from(bestKeys).map(
      (key) => queriesByKey.get(key)?.original ?? key,
    )
    const reason = coverageFallbackReason(noteLabels)
    const augmented: ProductInsightSubreddit = {
      ...candidate,
      relevanceReason: candidate.relevanceReason
        ? `${candidate.relevanceReason} • ${reason}`
        : reason,
    }

    additions.push(augmented)

    const nameKey = augmented.name?.toLowerCase()
    if (nameKey) {
      existingNames.add(nameKey)
    }

    bestKeys.forEach((key) => {
      unmatchedKeys.delete(key)
    })
  }

  const combined = dedupeSubreddits([...baseList, ...additions])
  const finalStats = computeCoverage(queriesByKey, combined)

  return {
    subreddits: combined.sort((a, b) => sortScore(b) - sortScore(a)),
    coverage: finalStats.coverage,
    matchedCount: finalStats.matchedCount,
  }
}

function dedupeSubreddits(
  subreddits: ProductInsightSubreddit[],
): ProductInsightSubreddit[] {
  const map = new Map<string, ProductInsightSubreddit>()
  for (const subreddit of subreddits) {
    const key = subreddit.name?.toLowerCase()
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, subreddit)
    }
  }
  return Array.from(map.values())
}

type RelevanceVerdict = z.infer<
  typeof RelevanceResponseSchema
>["subreddits"][number]

function truncateText(value: string | null | undefined, max: number) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`
}

function sanitizeAudienceValue(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function buildCacheKey(productId: string) {
  return `${REDDIT_CACHE_NAMESPACE}:${productId}`
}

async function generateSearchQueries({
  product,
  summary,
}: {
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
}): Promise<{
  queries: ProductInsightSubredditQuery[]
  model: string
}> {
  const openai = getOpenAIClient()
  const productDetails = {
    name: product.name,
    ...(product.tagline ? { tagline: product.tagline } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(product.pricingModel ? { pricingModel: product.pricingModel } : {}),
    ...(typeof product.startingPriceCents === "number"
      ? { startingPriceCents: product.startingPriceCents }
      : {}),
    ...(product.currencyCode ? { currencyCode: product.currencyCode } : {}),
    ...(product.type ? { type: product.type } : {}),
    ...(product.keywords && product.keywords.length
      ? { keywords: product.keywords.slice(0, 12) }
      : {}),
    ...(product.platforms && product.platforms.length
      ? { platforms: product.platforms.slice(0, 8) }
      : {}),
  }

  const payload: Record<string, unknown> = {
    objective:
      "Construct specific Reddit search queries that will surface subreddits relevant to the product's audience, features, and pain points.",
    guidance: [
      "Tailor each query to a distinct angle (audience, use case, competitor, pain point).",
      "Prefer multi-word queries rooted in the product's workflows or value props over generic single keywords.",
      "Avoid including 'reddit' or 'subreddit' in the query text.",
      "Focus on communities likely to discuss solutions, alternatives, or workflows tied to this product.",
      "Exclude broad, generic communities (e.g. r/technology, r/startups, r/marketing) unless the product explicitly serves them.",
      "Prioritize queries that surface practitioners, buyers, or power users who match the product's described audience.",
      "Return null for rationale or audience when you cannot infer them with confidence.",
      "Favor queries that expose unmet needs, friction, or enhancement opportunities instead of echoing existing feature descriptions.",
    ],
    product: productDetails,
  }

  if (summary) {
    payload.summary = summary
    payload.existingCapabilities = summary.keyFeatures ?? []
  }

  console.info("[productInsights:subreddit] generating query plan", {
    hasSummary: Boolean(summary),
    keywordCount: product.keywords?.length ?? 0,
    platformCount: product.platforms?.length ?? 0,
  })

  const queryModel = getProductInsightSubredditModel()

  const response = await openai.responses.create({
    model: queryModel,
    temperature: 0.2,
    max_output_tokens: 750,
    text: {
      format: {
        type: "json_schema",
        name: "product_reddit_query_plan",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            queries: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  query: { type: "string", minLength: 4 },
                  rationale: { type: ["string", "null"] },
                  audience: { type: ["string", "null"] },
                },
                required: ["query", "rationale", "audience"],
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
          "You are a growth strategist skilled at identifying where a product's audience gathers on Reddit. Return only JSON that matches the schema.",
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  } as any)

  const rawJson = extractAssistantJson(response)
  const jsonText = coerceJsonText(rawJson)
  let parsed: z.infer<typeof QueryResponseSchema>
  try {
    parsed = QueryResponseSchema.parse(JSON.parse(jsonText || "{}"))
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Query plan schema invalid: ${error.message}`)
    }
    throw error
  }

  const queries: ProductInsightSubredditQuery[] = parsed.queries.map(
    (item) => ({
      query: item.query.trim(),
      rationale: item.rationale?.trim() || null,
      audience: sanitizeAudienceValue(item.audience),
    }),
  )

  console.info("[productInsights:subreddit] query plan ready", {
    queryCount: queries.length,
    sample: queries[0]?.query,
  })

  return {
    queries,
    model: queryModel,
  }
}

async function searchRedditSubreddits(
  query: string,
  accessToken: string,
): Promise<ProductInsightSubreddit[]> {
  const url = new URL("https://oauth.reddit.com/subreddits/search")
  url.searchParams.set("q", query)
  url.searchParams.set("limit", "15")
  url.searchParams.set("include_over_18", "false")
  url.searchParams.set("show", "all")

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": REDDIT_USER_AGENT,
    },
  })

  if (response.status === 429) {
    throw new Error("Reddit API rate limit reached while searching subreddits")
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Failed to search subreddits for query "${query}" (status ${response.status}): ${body}`,
    )
  }

  const json = (await response.json()) as any
  const children: any[] = json?.data?.children ?? []

  return children
    .map((child) => child?.data)
    .filter((data): data is Record<string, any> => Boolean(data?.display_name))
    .map((data) => {
      const url = data.url?.startsWith("http")
        ? data.url
        : `https://www.reddit.com${data.url || ""}`
      return {
        id: typeof data.id === "string" ? data.id : undefined,
        name: data.display_name as string,
        title: data.title as string | undefined,
        description: data.public_description as string | undefined,
        url,
        subscribers:
          typeof data.subscribers === "number" ? data.subscribers : undefined,
        activeUserCount:
          typeof data.active_user_count === "number"
            ? data.active_user_count
            : undefined,
        over18: typeof data.over18 === "boolean" ? data.over18 : undefined,
        iconUrl:
          (data.community_icon || data.icon_img || "")?.split("?")[0] ||
          undefined,
        primaryTopic: data.primary_topic as string | undefined,
        score:
          typeof data.subscriber_count === "number"
            ? data.subscriber_count
            : typeof data.subscribers === "number"
              ? data.subscribers
              : undefined,
      }
    })
}

function rankAndMergeSubreddits(
  queryResults: Array<{
    query: string
    subreddits: ProductInsightSubreddit[]
  }>,
): ProductInsightSubreddit[] {
  const map = new Map<
    string,
    ProductInsightSubreddit & { matchedQuerySet: Set<string> }
  >()

  for (const { query, subreddits } of queryResults) {
    for (let index = 0; index < subreddits.length; index += 1) {
      const result = subreddits[index]
      const key = result.name.toLowerCase()
      const scoreBoost = Math.max(0, 100 - index * 4)
      const existing = map.get(key)
      if (existing) {
        existing.matchedQuerySet.add(query)
        const existingScore = existing.score ?? 0
        const candidateScore =
          (result.score ?? result.subscribers ?? 0) + scoreBoost
        if (candidateScore > existingScore) {
          existing.score = candidateScore
          existing.subscribers = result.subscribers ?? existing.subscribers
          existing.activeUserCount =
            result.activeUserCount ?? existing.activeUserCount
          existing.description = result.description ?? existing.description
          existing.primaryTopic = result.primaryTopic ?? existing.primaryTopic
          existing.iconUrl = result.iconUrl ?? existing.iconUrl
        }
      } else {
        map.set(key, {
          ...result,
          score: (result.score ?? result.subscribers ?? 0) + scoreBoost,
          matchedQuerySet: new Set([query]),
        })
      }
    }
  }

  return Array.from(map.values())
    .map<ProductInsightSubreddit>((entry) => ({
      id: entry.id,
      name: entry.name,
      title: entry.title,
      description: entry.description,
      url: entry.url,
      subscribers: entry.subscribers,
      activeUserCount: entry.activeUserCount,
      over18: entry.over18,
      iconUrl: entry.iconUrl,
      primaryTopic: entry.primaryTopic,
      score: entry.score,
      matchedQueries: Array.from(entry.matchedQuerySet),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 15)
}

async function refineSubredditRecommendations({
  product,
  summary,
  queries,
  subreddits,
}: {
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  queries: ProductInsightSubredditQuery[]
  subreddits: ProductInsightSubreddit[]
}): Promise<{ subreddits: ProductInsightSubreddit[]; model: string } | null> {
  if (!subreddits.length) return null

  const openai = getOpenAIClient()

  const evaluationPayload: Record<string, unknown> = {
    product,
    summary,
    queries,
    candidates: subreddits.map((entry) => ({
      name: entry.name,
      title: truncateText(entry.title ?? null, 160),
      description: truncateText(entry.description ?? null, 360),
      primaryTopic: entry.primaryTopic ?? null,
      matchedQueries: entry.matchedQueries ?? [],
      subscribers: entry.subscribers ?? null,
      activeUsers: entry.activeUserCount ?? null,
    })),
  }

  if (summary?.keyFeatures?.length) {
    evaluationPayload.existingCapabilities = summary.keyFeatures
  }

  console.info("[productInsights:subreddit] evaluating relevance with model", {
    candidateCount: subreddits.length,
  })

  const evaluationModel = getProductInsightSubredditRelevanceModel()

  try {
    const response = await openai.responses.create({
      model: evaluationModel,
      temperature: 0.1,
      max_output_tokens: 900,
      text: {
        format: {
          type: "json_schema",
          name: "product_reddit_relevance",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              subreddits: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    keep: { type: "boolean" },
                    relevance: { type: "number", minimum: 0, maximum: 1 },
                    rationale: { type: "string", minLength: 6 },
                  },
                  required: ["name", "keep", "relevance", "rationale"],
                },
              },
            },
            required: ["subreddits"],
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a product growth strategist vetting Reddit communities. Evaluate every candidate subreddit for how well it matches the described product. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            objective:
              "Score each candidate subreddit for relevance. Keep only tightly aligned communities; mark everything else with keep=false.",
            scoringGuidelines: [
              "Assign high relevance (>=0.7) only when the community clearly centers on the product's niche, users, or problems.",
              "Give low relevance (<0.3) to generic programming, marketing, entrepreneurship, or news subreddits unless the product explicitly focuses on them.",
              "If the subreddit is off-topic, set keep=false and explain why in the rationale.",
              "Reference the matched queries and product details to justify each score.",
              "Evaluate every provided candidate; do not introduce new subreddit names.",
              "Down-rank communities that only celebrate existing features without discussing improvements, gaps, or alternatives.",
              "Favor subreddits where members share frustrations, wish lists, or upgrade ideas that the product could address.",
            ],
            context: evaluationPayload,
          }),
        },
      ],
    } as any)

    const raw = extractAssistantJson(response)
    const jsonText = coerceJsonText(raw)
    const parsed = RelevanceResponseSchema.parse(JSON.parse(jsonText || "{}"))

    const evaluationMap = new Map(
      parsed.subreddits.map((item) => [item.name.toLowerCase(), item]),
    )

    const evaluated = subreddits
      .map((candidate) => {
        const verdict = evaluationMap.get(candidate.name.toLowerCase())
        if (!verdict) return null

        const relevanceScore = Number.isFinite(verdict.relevance)
          ? verdict.relevance
          : 0

        const combinedScore = Math.round(
          relevanceScore * 1000 + (candidate.score ?? 0) / 20,
        )

        return {
          verdict,
          decorated: {
            ...candidate,
            relevanceScore,
            relevanceReason: verdict.rationale,
            score: combinedScore,
          } satisfies ProductInsightSubreddit,
        }
      })
      .filter(Boolean) as {
      verdict: RelevanceVerdict
      decorated: ProductInsightSubreddit
    }[]

    if (!evaluated.length) {
      return null
    }

    let curated = evaluated
      .filter(
        ({ verdict }) =>
          verdict.keep && verdict.relevance >= MIN_RELEVANCE_SCORE,
      )
      .map(({ decorated }) => decorated)
      .sort(
        (a, b) =>
          (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
          (b.score ?? 0) - (a.score ?? 0),
      )

    if (!curated.length) {
      curated = evaluated
        .filter(({ verdict }) => verdict.keep)
        .map(({ decorated }) => decorated)
        .sort(
          (a, b) =>
            (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
            (b.score ?? 0) - (a.score ?? 0),
        )
        .slice(0, Math.min(5, evaluated.length))
    }

    if (!curated.length) {
      curated = evaluated
        .map(({ decorated }) => decorated)
        .sort(
          (a, b) =>
            (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
            (b.score ?? 0) - (a.score ?? 0),
        )
        .slice(0, Math.min(3, evaluated.length))
    }

    console.info("[productInsights:subreddit] relevance evaluation completed", {
      kept: curated.length,
      dropped: subreddits.length - curated.length,
    })

    return {
      subreddits: curated,
      model: evaluationModel,
    }
  } catch (error) {
    console.error("[productInsights:subreddit] relevance evaluation failed", {
      error,
    })
    return null
  }
}

export type DiscoverProductSubredditsInput = {
  productId: string
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  forceRefresh?: boolean
}

export type DiscoverProductSubredditsResult = {
  queries: ProductInsightSubredditQuery[]
  subreddits: ProductInsightSubreddit[]
  model: string
  fromCache: boolean
  queryCoverage: number
  matchedQueryCount: number
}

export async function discoverProductSubreddits(
  input: DiscoverProductSubredditsInput,
): Promise<DiscoverProductSubredditsResult> {
  const { productId, product, summary, forceRefresh } = input
  const redis = await getRedisClient().catch(() => null)
  const cacheKey = buildCacheKey(productId)

  if (redis && !forceRefresh) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      try {
        const parsed = DiscoverResultSchema.parse(JSON.parse(cached))
        const coverageStats = computeCoverage(
          indexQueries(parsed.queries),
          parsed.subreddits,
        )
        const cachedCoverage =
          typeof parsed.queryCoverage === "number"
            ? parsed.queryCoverage
            : coverageStats.coverage
        const cachedMatchedCount =
          typeof parsed.matchedQueryCount === "number"
            ? parsed.matchedQueryCount
            : coverageStats.matchedCount
        console.info("[productInsights:subreddit] cache hit", {
          productId,
          subredditCount: parsed.subreddits.length,
        })
        return {
          queries: parsed.queries,
          subreddits: parsed.subreddits,
          model: parsed.model,
          fromCache: true,
          queryCoverage: cachedCoverage,
          matchedQueryCount: cachedMatchedCount,
        }
      } catch (error) {
        console.warn(
          "[productInsights:subreddit] failed to parse cached result",
          {
            productId,
            error,
          },
        )
      }
    }
  }

  const { queries, model } = await generateSearchQueries({
    product,
    summary,
  })

  const accessToken = await getRedditAccessToken()

  const queryResults: Array<{
    query: string
    subreddits: ProductInsightSubreddit[]
  }> = []

  for (const query of queries) {
    console.info("[productInsights:subreddit] searching reddit", {
      productId,
      query: query.query,
    })
    try {
      const subreddits = await searchRedditSubreddits(query.query, accessToken)
      queryResults.push({ query: query.query, subreddits })
    } catch (error) {
      console.error("[productInsights:subreddit] search failed", {
        productId,
        query: query.query,
        error,
      })
    }
  }

  const merged = rankAndMergeSubreddits(queryResults)

  let finalSubreddits = merged
  let relevanceModel: string | null = null

  if (merged.length) {
    const refinement = await refineSubredditRecommendations({
      product,
      summary,
      queries,
      subreddits: merged,
    })

    if (refinement && refinement.subreddits.length) {
      finalSubreddits = refinement.subreddits
      relevanceModel = refinement.model
    }
  }

  console.info("[productInsights:subreddit] discovery completed", {
    productId,
    queryCount: queries.length,
    discoveredCount: merged.length,
    curatedCount: finalSubreddits.length,
  })

  const coverageResult = boostCoverage({
    queries,
    selected: finalSubreddits,
    fallbackPool: merged,
    minimumCoverage: MIN_QUERY_MATCH_COVERAGE,
  })

  finalSubreddits = coverageResult.subreddits

  if (coverageResult.coverage < MIN_QUERY_MATCH_COVERAGE && queries.length) {
    console.warn("[productInsights:subreddit] query coverage below target", {
      productId,
      coverage: coverageResult.coverage,
      minimum: MIN_QUERY_MATCH_COVERAGE,
      queryCount: queries.length,
    })
  } else if (
    coverageResult.coverage >= MIN_QUERY_MATCH_COVERAGE &&
    queries.length
  ) {
    console.info("[productInsights:subreddit] query coverage achieved", {
      productId,
      coverage: coverageResult.coverage,
      queryCount: queries.length,
    })
  }

  if (redis && merged.length) {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify({
          queries,
          subreddits: finalSubreddits,
          model: relevanceModel ? `${model} → ${relevanceModel}` : model,
          queryCoverage: coverageResult.coverage,
          matchedQueryCount: coverageResult.matchedCount,
        }),
        { EX: REDDIT_CACHE_TTL_SECONDS },
      )
    } catch (error) {
      console.warn(
        "[productInsights:subreddit] failed to cache discovery result",
        {
          productId,
          error,
        },
      )
    }
  }

  return {
    queries,
    subreddits: finalSubreddits,
    model: relevanceModel ? `${model} → ${relevanceModel}` : model,
    fromCache: false,
    queryCoverage: coverageResult.coverage,
    matchedQueryCount: coverageResult.matchedCount,
  }
}
