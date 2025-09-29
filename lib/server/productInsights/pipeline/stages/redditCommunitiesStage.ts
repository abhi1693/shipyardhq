import { discoverProductSubreddits } from "@/lib/server/productInsights"
import type { PipelineStage } from "../types"

export type RedditCommunitiesResult = Awaited<
  ReturnType<typeof discoverProductSubreddits>
>

export const redditCommunitiesStage: PipelineStage<
  "reddit.communities",
  RedditCommunitiesResult
> = {
  id: "reddit.communities",
  providerType: "reddit",
  dependencies: ["product.snapshot"],
  retryPolicy: {
    maxAttempts: 3,
  },
  async execute(context) {
    return discoverProductSubreddits({
      productId: context.productId,
      product: context.product,
      summary: context.shared.summary ?? undefined,
      forceRefresh: true,
    })
  },
  serialize(result) {
    const data = {
      queries: result.queries,
      subreddits: result.subreddits,
      model: result.model,
      discoveredAt: new Date().toISOString(),
      queryCoverage: result.queryCoverage,
      matchedQueryCount: result.matchedQueryCount,
    }

    return {
      data,
      metrics: {
        queryCount: result.queries.length,
        communityCount: result.subreddits.length,
        fromCache: result.fromCache ?? false,
        queryCoverage: result.queryCoverage,
        matchedQueryCount: result.matchedQueryCount,
      },
      shared: {
        communities: data,
      },
    }
  },
}
