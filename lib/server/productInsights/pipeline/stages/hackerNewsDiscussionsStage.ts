import { discoverProductHackerNewsMentions } from "@/lib/server/productInsights"
import type { PipelineStage } from "../types"

export type HackerNewsDiscussionsResult = Awaited<
  ReturnType<typeof discoverProductHackerNewsMentions>
>

export const hackerNewsDiscussionsStage: PipelineStage<
  "hackernews.discussions",
  HackerNewsDiscussionsResult
> = {
  id: "hackernews.discussions",
  providerType: "hackernews",
  dependencies: ["product.snapshot", "product.competitors"],
  retryPolicy: {
    maxAttempts: 3,
  },
  async execute(context) {
    return discoverProductHackerNewsMentions({
      productId: context.productId,
      product: context.product,
      summary: context.shared.summary ?? undefined,
      competitors: context.shared.competitors?.competitors ?? undefined,
      forceRefresh: true,
    })
  },
  serialize(result) {
    const data = {
      queries: result.queries,
      stories: result.stories,
      summary: result.summary ?? null,
      model: result.model,
      discoveredAt: new Date().toISOString(),
    }

    return {
      data,
      metrics: {
        queryCount: result.queries.length,
        storyCount: result.stories.length,
        fromCache: result.fromCache ?? false,
        apiCalls: result.apiCalls,
        topScore: result.stories[0]?.points ?? null,
        highlightCount: result.summary?.highlights?.length ?? 0,
      },
      shared: {
        hackerNews: data,
      },
    }
  },
}
