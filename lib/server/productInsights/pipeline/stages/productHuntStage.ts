import { discoverProductHuntLaunches } from "@/lib/server/productInsights"
import type { PipelineStage } from "../types"

export const productHuntStage: PipelineStage<
  "producthunt.launches",
  Awaited<ReturnType<typeof discoverProductHuntLaunches>>
> = {
  id: "producthunt.launches",
  providerType: "producthunt",
  dependencies: ["product.snapshot", "product.competitors"],
  retryPolicy: {
    maxAttempts: 2,
  },
  async execute(context) {
    return discoverProductHuntLaunches({
      productId: context.productId,
      product: context.product,
      summary: context.shared.summary ?? undefined,
    })
  },
  serialize(result) {
    const fetchedAt = result.data.fetchedAt ?? new Date().toISOString()
    const data = {
      queries: result.data.queries,
      launches: result.data.launches,
      similarLaunches: result.data.similarLaunches ?? null,
      matchedLaunchId: result.data.matchedLaunchId ?? null,
      summary: result.data.summary ?? null,
      model: result.data.model ?? result.model,
      fetchedAt,
      fromCache: result.data.fromCache ?? result.fromCache ?? false,
    }

    return {
      data,
      metrics: {
        launchCount: data.launches.length,
        similarLaunchCount: data.similarLaunches?.length ?? 0,
        featuredLaunchCount: data.summary?.featuredLaunchCount ?? 0,
        totalVotes: data.summary?.totalVotes ?? null,
        totalComments: data.summary?.totalComments ?? null,
        averageVotesPerDay: data.summary?.averageVotesPerDay ?? null,
        fromCache: data.fromCache,
      },
      shared: {
        productHunt: data,
      },
    }
  },
}
