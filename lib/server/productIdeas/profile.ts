import type { Prisma } from "@/lib/vendor/prisma/client"

import type {
  ProductIdeaComprehensiveReport,
  ProductIdeaRedditComment,
  ProductIdeaRedditDiscussionQuery,
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
  ProductIdeaSubreddit,
  ProductIdeaSubredditQuery,
  SerializedIdeaProfile,
} from "@/types/product-ideas"
import type {
  ProductIdeaPageSnapshot,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"
import {
  getProductIdeaDiscussionModelLabel,
  getProductIdeaSubredditModelLabel,
} from "@/lib/server/productIdeas/config"

export const ideaProfileSelect = {
  id: true,
  productId: true,
  sitemapUrl: true,
  discoveredUrls: true,
  pages: true,
  summary: true,
  summaryText: true,
  subredditQueries: true,
  subreddits: true,
  subredditStatus: true,
  subredditErrorMessage: true,
  redditDiscussionQueries: true,
  redditDiscussions: true,
  redditInsights: true,
  redditStatus: true,
  redditErrorMessage: true,
  finalReport: true,
  finalReportStatus: true,
  finalReportErrorMessage: true,
  finalReportModel: true,
  status: true,
  errorMessage: true,
  model: true,
  lastSubredditDiscoveryAt: true,
  lastRedditDiscoveryAt: true,
  lastFinalReportAt: true,
  lastCrawledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductIdeaProfileSelect

export type IdeaProfileRecord = Prisma.ProductIdeaProfileGetPayload<{
  select: typeof ideaProfileSelect
}>

export function serializeIdeaProfile(
  record: IdeaProfileRecord | null,
): SerializedIdeaProfile | null {
  if (!record) return null

  const discoveredUrls = Array.isArray(record.discoveredUrls)
    ? (record.discoveredUrls as unknown[]).filter(
        (value): value is string => typeof value === "string",
      )
    : null

  const pages = Array.isArray(record.pages)
    ? (record.pages as unknown[] as ProductIdeaPageSnapshot[])
    : null

  const summary = record.summary ? (record.summary as ProductIdeaSummary) : null

  const subredditQueries = Array.isArray(record.subredditQueries)
    ? (record.subredditQueries as unknown[]).reduce<
        ProductIdeaSubredditQuery[]
      >((acc, value) => {
        if (
          value !== null &&
          typeof value === "object" &&
          typeof (value as any).query === "string"
        ) {
          acc.push({
            query: (value as any).query,
            rationale:
              typeof (value as any).rationale === "string"
                ? (value as any).rationale
                : null,
            audience:
              typeof (value as any).audience === "string"
                ? (value as any).audience
                : null,
          })
        }
        return acc
      }, [])
    : null

  const subreddits = Array.isArray(record.subreddits)
    ? (record.subreddits as unknown[]).reduce<ProductIdeaSubreddit[]>(
        (acc, value) => {
          if (
            value !== null &&
            typeof value === "object" &&
            typeof (value as any).name === "string" &&
            typeof (value as any).url === "string"
          ) {
            acc.push({
              id:
                typeof (value as any).id === "string"
                  ? (value as any).id
                  : null,
              name: (value as any).name,
              title:
                typeof (value as any).title === "string"
                  ? (value as any).title
                  : null,
              description:
                typeof (value as any).description === "string"
                  ? (value as any).description
                  : null,
              url: (value as any).url,
              subscribers:
                typeof (value as any).subscribers === "number"
                  ? (value as any).subscribers
                  : null,
              activeUserCount:
                typeof (value as any).activeUserCount === "number"
                  ? (value as any).activeUserCount
                  : null,
              over18:
                typeof (value as any).over18 === "boolean"
                  ? (value as any).over18
                  : null,
              iconUrl:
                typeof (value as any).iconUrl === "string"
                  ? (value as any).iconUrl
                  : null,
              primaryTopic:
                typeof (value as any).primaryTopic === "string"
                  ? (value as any).primaryTopic
                  : null,
              score:
                typeof (value as any).score === "number"
                  ? (value as any).score
                  : null,
              matchedQueries: Array.isArray((value as any).matchedQueries)
                ? ((value as any).matchedQueries as unknown[]).filter(
                    (entry): entry is string => typeof entry === "string",
                  )
                : null,
              relevanceScore:
                typeof (value as any).relevanceScore === "number"
                  ? (value as any).relevanceScore
                  : null,
              relevanceReason:
                typeof (value as any).relevanceReason === "string"
                  ? (value as any).relevanceReason
                  : null,
            })
          }
          return acc
        },
        [],
      )
    : null

  const redditDiscussionQueries = Array.isArray(record.redditDiscussionQueries)
    ? (record.redditDiscussionQueries as unknown[]).reduce<
        ProductIdeaRedditDiscussionQuery[]
      >((acc, value) => {
        if (
          value !== null &&
          typeof value === "object" &&
          typeof (value as any).query === "string"
        ) {
          acc.push({
            query: (value as any).query,
            rationale:
              typeof (value as any).rationale === "string"
                ? (value as any).rationale
                : null,
            targetSubreddit:
              typeof (value as any).targetSubreddit === "string"
                ? (value as any).targetSubreddit
                : null,
          })
        }
        return acc
      }, [])
    : null

  const redditDiscussions = Array.isArray(record.redditDiscussions)
    ? (record.redditDiscussions as unknown[]).reduce<
        ProductIdeaRedditThread[]
      >((acc, value) => {
        if (
          value !== null &&
          typeof value === "object" &&
          typeof (value as any).id === "string" &&
          typeof (value as any).title === "string" &&
          typeof (value as any).permalink === "string"
        ) {
          acc.push({
            id: (value as any).id,
            title: (value as any).title,
            url:
              typeof (value as any).url === "string"
                ? (value as any).url
                : (value as any).permalink,
            permalink: (value as any).permalink,
            subreddit:
              typeof (value as any).subreddit === "string"
                ? (value as any).subreddit
                : "",
            author:
              typeof (value as any).author === "string"
                ? (value as any).author
                : null,
            score:
              typeof (value as any).score === "number"
                ? (value as any).score
                : null,
            numComments:
              typeof (value as any).numComments === "number"
                ? (value as any).numComments
                : null,
            createdAt:
              typeof (value as any).createdAt === "string"
                ? (value as any).createdAt
                : null,
            flairText:
              typeof (value as any).flairText === "string"
                ? (value as any).flairText
                : null,
            matchedQueries: Array.isArray((value as any).matchedQueries)
              ? ((value as any).matchedQueries as unknown[]).filter(
                  (entry): entry is string => typeof entry === "string",
                )
              : null,
            topComments: Array.isArray((value as any).topComments)
              ? ((value as any).topComments as unknown[]).reduce<
                  ProductIdeaRedditComment[]
                >((commentAcc, comment) => {
                  if (
                    comment !== null &&
                    typeof comment === "object" &&
                    typeof (comment as any).id === "string" &&
                    typeof (comment as any).body === "string"
                  ) {
                    commentAcc.push({
                      id: (comment as any).id,
                      body: (comment as any).body,
                      author:
                        typeof (comment as any).author === "string"
                          ? (comment as any).author
                          : null,
                      score:
                        typeof (comment as any).score === "number"
                          ? (comment as any).score
                          : null,
                      createdAt:
                        typeof (comment as any).createdAt === "string"
                          ? (comment as any).createdAt
                          : null,
                    })
                  }
                  return commentAcc
                }, [])
              : null,
          })
        }
        return acc
      }, [])
    : null

  let redditInsights: ProductIdeaRedditInsightReport | null = null
  if (record.redditInsights && typeof record.redditInsights === "object") {
    const raw = record.redditInsights as Record<string, unknown>
    if (
      "summary" in raw &&
      typeof raw.summary === "string" &&
      Array.isArray((raw as any).sections)
    ) {
      redditInsights = raw as ProductIdeaRedditInsightReport
    }
  }

  let finalReport: ProductIdeaComprehensiveReport | null = null
  if (record.finalReport && typeof record.finalReport === "object") {
    const raw = record.finalReport as Record<string, unknown>
    if (
      typeof raw.executiveSummary === "string" &&
      Array.isArray((raw as any).headlineHighlights)
    ) {
      finalReport = raw as ProductIdeaComprehensiveReport
    }
  }

  return {
    id: record.id,
    productId: record.productId,
    sitemapUrl: record.sitemapUrl,
    discoveredUrls,
    pages,
    summary,
    summaryText: record.summaryText,
    status: record.status,
    errorMessage: record.errorMessage,
    model: record.model,
    subredditQueries,
    subreddits,
    subredditStatus: record.subredditStatus ?? null,
    subredditErrorMessage: record.subredditErrorMessage,
    subredditModel: getProductIdeaSubredditModelLabel(),
    redditDiscussionQueries,
    redditDiscussions,
    redditInsights,
    redditStatus: record.redditStatus ?? null,
    redditErrorMessage: record.redditErrorMessage,
    redditModel: getProductIdeaDiscussionModelLabel(),
    finalReport,
    finalReportStatus: record.finalReportStatus ?? null,
    finalReportErrorMessage: record.finalReportErrorMessage,
    finalReportModel: record.finalReportModel,
    lastCrawledAt: record.lastCrawledAt
      ? record.lastCrawledAt.toISOString()
      : null,
    lastSubredditDiscoveryAt: record.lastSubredditDiscoveryAt
      ? record.lastSubredditDiscoveryAt.toISOString()
      : null,
    lastRedditDiscoveryAt: record.lastRedditDiscoveryAt
      ? record.lastRedditDiscoveryAt.toISOString()
      : null,
    lastFinalReportAt: record.lastFinalReportAt
      ? record.lastFinalReportAt.toISOString()
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
