import { createHash } from "node:crypto"

import { z } from "zod"

import {
  getProductHuntAppId,
  getProductHuntIndexName,
  getProductHuntSearchKey,
} from "@/lib/server/productInsights/config"
import { buildCacheKey as buildCompositeKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"
import type {
  ProductInsightCompetitor,
  ProductInsightProductHuntStageData,
} from "@/types/product-insights"

const CACHE_TTL_SECONDS = 60 * 60 * 3
const MAX_QUERIES = 4
const HITS_PER_PAGE = 6
const PROVIDER_MODEL = "producthunt.algolia/post_production"
const SIMILAR_LAUNCH_LIMIT = 10
const TOPIC_FACET_LIMIT = 3
const COMPETITOR_QUERY_LIMIT = 5
const FEATURE_QUERY_LIMIT = 5
const KEYWORD_RESULT_LIMIT = 6
const MS_PER_DAY = 86_400_000
const MAX_LAUNCH_AGE_DAYS = 183
const MAX_LAUNCH_LOOKBACK_LABEL = "6 months"
const MAX_LAUNCH_AGE_MS = MAX_LAUNCH_AGE_DAYS * MS_PER_DAY

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "your",
  "you",
  "we",
  "our",
  "this",
  "that",
  "their",
  "they",
  "them",
  "by",
  "how",
  "for",
  "all",
  "more",
  "new",
  "into",
  "over",
  "get",
  "make",
  "made",
  "build",
  "built",
  "work",
  "help",
  "helps",
  "using",
])

const TopicSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  followers_count: z.number().nullable().optional(),
})

const MakerSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

const LinkSchema = z.object({
  store_name: z.string().nullable().optional(),
  url: z.string(),
})

const HitSchema = z.object({
  objectID: z.string(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  vote_count: z.number().nullable().optional(),
  comments_count: z.number().nullable().optional(),
  featured_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  topics: z.array(TopicSchema).nullable().optional(),
  product_links: z.array(LinkSchema).nullable().optional(),
  user: MakerSchema.nullable().optional(),
  makers: z.array(MakerSchema).nullable().optional(),
})

const SearchResponseSchema = z.object({
  hits: z.array(HitSchema),
})

const SummarySchema = z
  .object({
    totalVotes: z.number().nullable().optional(),
    totalComments: z.number().nullable().optional(),
    featuredLaunchCount: z.number().nullable().optional(),
    averageVotesPerDay: z.number().nullable().optional(),
    topVotesPerDay: z
      .object({
        launchId: z.string(),
        value: z.number(),
      })
      .nullable()
      .optional(),
    recentLaunchCount: z.number().nullable().optional(),
    topTopics: z
      .array(
        z.object({
          name: z.string(),
          slug: z.string().nullable().optional(),
          followersCount: z.number().nullable().optional(),
          count: z.number(),
        }),
      )
      .nullable()
      .optional(),
    trendingKeywords: z.array(z.string()).nullable().optional(),
  })
  .nullable()
  .optional()

const CacheSchema = z.object({
  queries: z.array(z.string()),
  launches: z.array(HitSchema),
  similarLaunches: z.array(HitSchema).nullable().optional(),
  matchedLaunchId: z.string().nullable().optional(),
  summary: SummarySchema,
  fetchedAt: z.string().nullable().optional(),
})

type CachePayload = z.infer<typeof CacheSchema>

type DiscoverProductHuntLaunchesInput = {
  productId: string
  product: ProductInsightProductContext
  summary?: ProductInsightSummary | null
  forceRefresh?: boolean
  competitors?: ProductInsightCompetitor[] | null
}

export type DiscoverProductHuntLaunchesResult = {
  data: ProductInsightProductHuntStageData
  fromCache: boolean
  model: string
}

function buildProductHuntCacheKey(productId: string, hash: string) {
  return buildCompositeKey(
    "productInsights",
    "productHunt",
    "v1",
    productId,
    hash,
  )
}

function hashQueries(queries: string[]): string {
  const hash = createHash("sha256")
  for (const query of queries) {
    hash.update(query)
  }
  return hash.digest("hex").slice(0, 24)
}

function sanitizeUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `https://www.producthunt.com${path}`
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp)
}

function toDays(value: number): number {
  return value / MS_PER_DAY
}

function filterRecentLaunchHits(
  launches: z.infer<typeof HitSchema>[],
  now = Date.now(),
): z.infer<typeof HitSchema>[] {
  return launches.filter((launch) => {
    const createdAt =
      parseDate(launch.created_at ?? null) ??
      parseDate(launch.featured_at ?? null)
    if (!createdAt) return false
    const ageMs = now - createdAt.getTime()
    if (ageMs < 0) return true
    return ageMs <= MAX_LAUNCH_AGE_MS
  })
}

function roundNumber(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function sanitizeLaunch(hit: z.infer<typeof HitSchema>, rank: number) {
  let topicFollowerReach = 0
  const topics = (hit.topics ?? [])
    .filter((topic): topic is z.infer<typeof TopicSchema> => Boolean(topic))
    .map((topic) => {
      const followers =
        typeof topic.followers_count === "number" ? topic.followers_count : null
      if (typeof followers === "number") {
        topicFollowerReach += followers
      }
      return {
        id: topic.id ?? null,
        name: topic.name,
        slug: topic.slug ?? null,
        followersCount: followers,
      }
    })

  const links = (hit.product_links ?? [])
    .filter((link): link is z.infer<typeof LinkSchema> => Boolean(link?.url))
    .map((link) => ({
      label: link.store_name?.trim() || "Website",
      url: link.url,
    }))

  const createdAtValue = parseDate(hit.created_at ?? null)
  const featuredAtValue = parseDate(hit.featured_at ?? null)
  const now = Date.now()

  let daysSinceLaunch: number | null = null
  if (createdAtValue) {
    daysSinceLaunch = roundNumber(
      Math.max(1, toDays(now - createdAtValue.getTime())),
      1,
    )
  }

  const voteCount = typeof hit.vote_count === "number" ? hit.vote_count : null
  const commentsCount =
    typeof hit.comments_count === "number" ? hit.comments_count : null

  const votesPerDay =
    voteCount !== null && daysSinceLaunch
      ? roundNumber(voteCount / daysSinceLaunch, 2)
      : null

  const daysToFeature =
    createdAtValue && featuredAtValue
      ? roundNumber(
          Math.max(
            0,
            toDays(featuredAtValue.getTime() - createdAtValue.getTime()),
          ),
          1,
        )
      : null

  const commentToVoteRatio =
    voteCount && voteCount > 0 && commentsCount !== null
      ? roundNumber(commentsCount / voteCount, 2)
      : null

  return {
    id: hit.objectID,
    slug: hit.slug ?? hit.objectID,
    name: hit.name,
    tagline: hit.tagline ?? null,
    url:
      sanitizeUrl(hit.url) ??
      `https://www.producthunt.com/posts/${hit.slug ?? hit.objectID}`,
    externalUrl:
      links.find((link) => link.label.toLowerCase() === "website")?.url ??
      links[0]?.url ??
      null,
    voteCount,
    commentsCount,
    featuredAt: hit.featured_at ?? null,
    createdAt: hit.created_at ?? null,
    rank: rank + 1,
    topics: topics.length ? topics : null,
    makers: null,
    links: links.length ? links : null,
    votesPerDay,
    daysSinceLaunch,
    daysToFeature,
    topicFollowerReach: topicFollowerReach || null,
    commentToVoteRatio,
    isFeatured: Boolean(hit.featured_at),
  }
}

type SanitizedLaunch = ReturnType<typeof sanitizeLaunch>

function collectTopicStats(launches: SanitizedLaunch[]) {
  const map = new Map<
    string,
    {
      name: string
      slug?: string | null
      followersCount?: number | null
      count: number
    }
  >()

  for (const launch of launches) {
    if (!Array.isArray(launch.topics)) continue
    for (const topic of launch.topics) {
      if (!topic) continue
      const key = (topic.slug ?? topic.name).toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        if (
          typeof topic.followersCount === "number" &&
          (existing.followersCount ?? 0) < topic.followersCount
        ) {
          existing.followersCount = topic.followersCount
        }
      } else {
        map.set(key, {
          name: topic.name,
          slug: topic.slug ?? null,
          followersCount: topic.followersCount ?? null,
          count: 1,
        })
      }
    }
  }

  return map
}

function extractTopKeywords(launches: SanitizedLaunch[]): string[] {
  const counts = new Map<string, number>()

  for (const launch of launches) {
    if (!launch.tagline) continue
    const tokens = launch.tagline
      .toLowerCase()
      .replace(/[^a-z0-9+\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token))

    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0])
      return b[1] - a[1]
    })
    .slice(0, KEYWORD_RESULT_LIMIT)
    .map(([token]) => token)
}

function selectTopicFacetFilters(launches: SanitizedLaunch[]): string[] {
  const topicStats = collectTopicStats(launches)
  return Array.from(topicStats.values())
    .filter((topic) => Boolean(topic.slug))
    .sort((a, b) => {
      if (b.count === a.count) {
        return (b.followersCount ?? 0) - (a.followersCount ?? 0)
      }
      return b.count - a.count
    })
    .slice(0, TOPIC_FACET_LIMIT)
    .map((topic) => `topics.slug:${topic.slug}`)
}

function buildCompetitorQueries(
  competitors?: ProductInsightCompetitor[] | null,
  productName?: string | null,
): string[] {
  if (!Array.isArray(competitors)) return []
  const exclude = productName?.trim().toLowerCase()
  const seen = new Set<string>()
  const queries: string[] = []

  for (const competitor of competitors) {
    const name = competitor?.name?.trim()
    if (!name) continue
    const normalized = name.toLowerCase()
    if (exclude && normalized === exclude) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    queries.push(name)
    if (queries.length >= COMPETITOR_QUERY_LIMIT) break
  }

  return queries
}

function buildFeatureQueries(summary?: ProductInsightSummary | null): string[] {
  if (!summary) return []
  const candidates = new Set<string>()

  for (const list of [
    summary.keyFeatures,
    summary.valuePropositions,
    summary.painPointsAddressed,
  ] as Array<string[] | undefined>) {
    if (!Array.isArray(list)) continue
    for (const value of list) {
      if (typeof value !== "string") continue
      const trimmed = value.trim()
      if (trimmed.length < 3) continue
      candidates.add(trimmed)
      if (candidates.size >= FEATURE_QUERY_LIMIT) break
    }
    if (candidates.size >= FEATURE_QUERY_LIMIT) break
  }

  return Array.from(candidates)
}

function buildSummary(
  launches: SanitizedLaunch[],
  similarLaunches: SanitizedLaunch[],
) {
  const allLaunches = [...launches, ...similarLaunches]
  if (allLaunches.length === 0) return null

  let totalVotes = 0
  let totalComments = 0
  let featuredLaunchCount = 0
  let votesPerDaySum = 0
  let votesPerDayCount = 0
  let recentLaunchCount = 0
  let topVotesPerDayLaunch: { launchId: string; value: number } | null = null

  const topicStats = collectTopicStats(allLaunches)

  const now = Date.now()

  for (const launch of allLaunches) {
    if (typeof launch.voteCount === "number") {
      totalVotes += launch.voteCount
    }
    if (typeof launch.commentsCount === "number") {
      totalComments += launch.commentsCount
    }
    if (launch.isFeatured) {
      featuredLaunchCount += 1
    }
    if (typeof launch.votesPerDay === "number") {
      votesPerDaySum += launch.votesPerDay
      votesPerDayCount += 1
      if (
        !topVotesPerDayLaunch ||
        launch.votesPerDay > topVotesPerDayLaunch.value
      ) {
        topVotesPerDayLaunch = {
          launchId: launch.id,
          value: launch.votesPerDay,
        }
      }
    }

    const createdAtValue = parseDate(launch.createdAt ?? null)
    if (createdAtValue) {
      const daysSince = toDays(now - createdAtValue.getTime())
      if (daysSince <= MAX_LAUNCH_AGE_DAYS) {
        recentLaunchCount += 1
      }
    }
  }

  const topTopics = Array.from(topicStats.values())
    .sort((a, b) => {
      if (b.count === a.count) {
        return (b.followersCount ?? 0) - (a.followersCount ?? 0)
      }
      return b.count - a.count
    })
    .slice(0, 5)

  const trendingKeywords = extractTopKeywords(allLaunches)

  const insights: string[] = []
  if (topVotesPerDayLaunch) {
    insights.push(
      `Fastest peer launch is gaining approximately ${roundNumber(topVotesPerDayLaunch.value, 2)} votes/day.`,
    )
  }
  if (topTopics.length) {
    insights.push(
      `Peer launches cluster around topics like ${topTopics
        .map((topic) => topic.name)
        .join(", ")}.`,
    )
  }
  if (trendingKeywords.length) {
    insights.push(
      `Common positioning keywords: ${trendingKeywords.join(", ")}.`,
    )
  }
  if (recentLaunchCount > 0) {
    insights.push(
      `${recentLaunchCount} similar launches hit Product Hunt in the last ${MAX_LAUNCH_LOOKBACK_LABEL}.`,
    )
  }

  return {
    totalVotes,
    totalComments,
    featuredLaunchCount,
    averageVotesPerDay:
      votesPerDayCount > 0
        ? roundNumber(votesPerDaySum / votesPerDayCount, 2)
        : null,
    topVotesPerDay: topVotesPerDayLaunch,
    recentLaunchCount,
    topTopics: topTopics.length ? topTopics : null,
    trendingKeywords: trendingKeywords.length ? trendingKeywords : null,
    insights: insights.length ? insights : null,
  }
}

async function collectSimilarLaunchHits(options: {
  appId: string
  apiKey: string
  indexName: string
  competitorQueries: string[]
  featureQueries: string[]
  topicFacetFilters: string[]
  seenIds: Set<string>
}): Promise<z.infer<typeof HitSchema>[]> {
  const similarHits: z.infer<typeof HitSchema>[] = []

  const addHits = (hits: z.infer<typeof HitSchema>[]) => {
    for (const hit of hits) {
      if (!hit || typeof hit.objectID !== "string") continue
      if (options.seenIds.has(hit.objectID)) continue
      options.seenIds.add(hit.objectID)
      similarHits.push(hit)
      if (similarHits.length >= SIMILAR_LAUNCH_LIMIT) {
        return true
      }
    }
    return false
  }

  for (const query of options.competitorQueries) {
    const hits = await fetchLaunches(
      options.appId,
      options.apiKey,
      options.indexName,
      {
        query,
        hitsPerPage: 4,
      },
    )
    if (addHits(hits)) return similarHits
  }

  for (const query of options.featureQueries) {
    const hits = await fetchLaunches(
      options.appId,
      options.apiKey,
      options.indexName,
      {
        query,
        hitsPerPage: 3,
      },
    )
    if (addHits(hits)) return similarHits
  }

  for (const facet of options.topicFacetFilters) {
    const hits = await fetchLaunches(
      options.appId,
      options.apiKey,
      options.indexName,
      {
        query: "",
        facetFilters: [facet],
        hitsPerPage: 4,
      },
    )
    if (addHits(hits)) return similarHits
  }

  return similarHits
}

function buildQueries(
  product: ProductInsightProductContext,
  summary: ProductInsightSummary | null | undefined,
): string[] {
  const queries = new Set<string>()

  if (product.name) {
    queries.add(product.name)
  }

  for (const keyword of product.keywords ?? []) {
    if (typeof keyword === "string" && keyword.trim().length > 2) {
      queries.add(keyword.trim())
    }
  }

  if (summary) {
    for (const value of summary.keyFeatures ?? []) {
      if (value && value.length <= 60) {
        queries.add(value)
      }
    }

    for (const value of summary.valuePropositions ?? []) {
      if (value && value.length <= 60) {
        queries.add(value)
      }
    }
  }

  return Array.from(queries).slice(0, MAX_QUERIES)
}

type SearchOptions = {
  query?: string
  hitsPerPage?: number
  facetFilters?: string[]
  filters?: string
}

async function fetchLaunches(
  appId: string,
  apiKey: string,
  indexName: string,
  options: SearchOptions,
): Promise<z.infer<typeof HitSchema>[]> {
  const endpoint = `https://${appId.toLowerCase()}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`

  const params = new URLSearchParams({
    query: options.query ?? "",
    hitsPerPage: String(options.hitsPerPage ?? HITS_PER_PAGE),
    getRankingInfo: "true",
  })

  if (options.filters) {
    params.set("filters", options.filters)
  }

  if (options.facetFilters?.length) {
    params.set("facetFilters", JSON.stringify(options.facetFilters))
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-API-Key": apiKey,
      "X-Algolia-Application-Id": appId,
    },
    body: JSON.stringify({ params: params.toString() }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `Product Hunt search failed (${response.status}): ${text.slice(0, 200)}`,
    )
  }

  const json = await response.json()
  const parsed = SearchResponseSchema.parse(json)
  return parsed.hits
}

function dedupeLaunches(
  launches: z.infer<typeof HitSchema>[],
  seen: Set<string> = new Set<string>(),
): z.infer<typeof HitSchema>[] {
  const result: z.infer<typeof HitSchema>[] = []
  for (const launch of launches) {
    const key = launch.objectID
    if (seen.has(key)) continue
    seen.add(key)
    result.push(launch)
  }
  return result
}

function resolveMatchedLaunchId(
  launches: ReturnType<typeof sanitizeLaunch>[],
  product: ProductInsightProductContext,
): string | null {
  if (!launches.length) return null

  const normalizedName = product.name?.trim().toLowerCase()
  if (normalizedName) {
    const direct = launches.find(
      (launch) => launch.name.trim().toLowerCase() === normalizedName,
    )
    if (direct) return direct.id
  }

  return launches[0]?.id ?? null
}

export async function discoverProductHuntLaunches(
  input: DiscoverProductHuntLaunchesInput,
): Promise<DiscoverProductHuntLaunchesResult> {
  const { productId, product, summary, forceRefresh, competitors } = input

  const appId = getProductHuntAppId()
  const apiKey = getProductHuntSearchKey()
  const indexName = getProductHuntIndexName()

  if (!appId || !apiKey) {
    console.warn("[productInsights:productHunt] missing API credentials")
    return {
      data: {
        queries: [],
        launches: [],
        similarLaunches: null,
        matchedLaunchId: null,
        summary: null,
        model: null,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
      },
      fromCache: false,
      model: PROVIDER_MODEL,
    }
  }

  const queries = buildQueries(product, summary)
  if (!queries.length && product.name?.trim()) {
    queries.push(product.name.trim())
  }

  if (!queries.length) {
    return {
      data: {
        queries: [],
        launches: [],
        similarLaunches: null,
        matchedLaunchId: null,
        summary: null,
        model: PROVIDER_MODEL,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
      },
      fromCache: false,
      model: PROVIDER_MODEL,
    }
  }

  const redis = await getRedisClient().catch(() => null)
  const hash = hashQueries(queries)
  const cacheKey = buildProductHuntCacheKey(productId, hash)

  if (!forceRefresh && redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const parsed = CacheSchema.parse(JSON.parse(cached))
        const cachedLaunches = filterRecentLaunchHits(parsed.launches)
        const sanitizedLaunches = cachedLaunches.map((launch, index) =>
          sanitizeLaunch(launch, index),
        )
        const cachedSimilarLaunches = filterRecentLaunchHits(
          parsed.similarLaunches ?? [],
        )
        const sanitizedSimilar = cachedSimilarLaunches.map((launch, index) =>
          sanitizeLaunch(launch, index),
        )
        const computedSummary =
          buildSummary(sanitizedLaunches, sanitizedSimilar) ??
          parsed.summary ??
          null
        const cachedMatchedLaunchId =
          parsed.matchedLaunchId &&
          sanitizedLaunches.some(
            (launch) => launch.id === parsed.matchedLaunchId,
          )
            ? parsed.matchedLaunchId
            : null
        const matchedLaunchId =
          cachedMatchedLaunchId ??
          resolveMatchedLaunchId(sanitizedLaunches, product)
        return {
          data: {
            queries: parsed.queries,
            launches: sanitizedLaunches,
            similarLaunches: sanitizedSimilar.length ? sanitizedSimilar : null,
            matchedLaunchId,
            summary: computedSummary,
            model: PROVIDER_MODEL,
            fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
            fromCache: true,
          },
          fromCache: true,
          model: PROVIDER_MODEL,
        }
      }
    } catch (error) {
      console.warn("[productInsights:productHunt] failed to load cache", error)
    }
  }

  const results: z.infer<typeof HitSchema>[] = []

  for (const query of queries) {
    try {
      const hits = await fetchLaunches(appId, apiKey, indexName, {
        query,
      })
      results.push(...hits)
    } catch (error) {
      console.warn("[productInsights:productHunt] query failed", {
        productId,
        query,
        error,
      })
    }
  }

  const seenIds = new Set<string>()
  const deduped = dedupeLaunches(results, seenIds)
  const recentLaunches = filterRecentLaunchHits(deduped)
  const sanitizedLaunches = recentLaunches.map((launch, index) =>
    sanitizeLaunch(launch, index),
  )

  const topicFacetFilters = selectTopicFacetFilters(sanitizedLaunches)
  const competitorQueries = buildCompetitorQueries(competitors, product.name)
  const featureQueries = buildFeatureQueries(summary)

  const similarHits = await collectSimilarLaunchHits({
    appId,
    apiKey,
    indexName,
    competitorQueries,
    featureQueries,
    topicFacetFilters,
    seenIds,
  })

  const recentSimilarLaunches = filterRecentLaunchHits(similarHits)
  const sanitizedSimilar = recentSimilarLaunches.map((launch, index) =>
    sanitizeLaunch(launch, index),
  )

  const summaryData = buildSummary(sanitizedLaunches, sanitizedSimilar)
  const matchedLaunchId = resolveMatchedLaunchId(sanitizedLaunches, product)

  if (redis) {
    const payload: CachePayload = {
      queries,
      launches: recentLaunches,
      similarLaunches: recentSimilarLaunches,
      matchedLaunchId,
      summary: summaryData,
      fetchedAt: new Date().toISOString(),
    }

    redis
      .set(cacheKey, JSON.stringify(payload), { EX: CACHE_TTL_SECONDS })
      .catch((error) => {
        console.warn(
          "[productInsights:productHunt] failed to persist cache",
          error,
        )
      })
  }

  return {
    data: {
      queries,
      launches: sanitizedLaunches,
      similarLaunches: sanitizedSimilar.length ? sanitizedSimilar : null,
      matchedLaunchId,
      summary: summaryData,
      model: PROVIDER_MODEL,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    },
    fromCache: false,
    model: PROVIDER_MODEL,
  }
}
