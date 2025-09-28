import { discoverProductDiscussions } from "@/lib/server/productInsights"
import type { PipelineStage } from "../types"

export type RedditDiscussionsResult = Awaited<
  ReturnType<typeof discoverProductDiscussions>
>

export const redditDiscussionsStage: PipelineStage<
  "reddit.discussions",
  RedditDiscussionsResult
> = {
  id: "reddit.discussions",
  providerType: "reddit",
  dependencies: ["product.snapshot", "reddit.communities"],
  retryPolicy: {
    maxAttempts: 3,
  },
  async execute(context) {
    const requestedMode = context.requestedModes?.discussions
    const previousMode =
      context.shared.discussions?.mode === "deep" ||
      context.stageViews?.["reddit.discussions"]?.metrics?.mode === "deep"
        ? "deep"
        : undefined
    const resolvedMode = requestedMode ?? previousMode
    return discoverProductDiscussions({
      productId: context.productId,
      product: context.product,
      summary: context.shared.summary ?? undefined,
      subreddits: context.shared.communities?.subreddits ?? undefined,
      forceRefresh: true,
      mode: resolvedMode,
    })
  },
  serialize(result) {
    const data = {
      queries: result.queries,
      threads: result.threads,
      insights: result.insights ?? null,
      model: result.model,
      discoveredAt: new Date().toISOString(),
      mode: result.mode,
    }

    return {
      data,
      metrics: {
        queryCount: result.queries.length,
        threadCount: result.threads.length,
        hasInsights: Boolean(result.insights),
        fromCache: result.fromCache ?? false,
        mode: result.mode,
      },
      shared: {
        discussions: data,
      },
    }
  },
}
