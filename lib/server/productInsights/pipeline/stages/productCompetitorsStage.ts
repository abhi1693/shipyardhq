import { discoverProductCompetitors } from "@/lib/server/productInsights"
import { toStageData } from "@/lib/server/productInsights/competitors"
import type { PipelineStage } from "../types"

export type ProductCompetitorsResult = Awaited<
  ReturnType<typeof discoverProductCompetitors>
>

export const productCompetitorsStage: PipelineStage<
  "product.competitors",
  ProductCompetitorsResult
> = {
  id: "product.competitors",
  providerType: "shipyard:intel",
  dependencies: ["product.snapshot"],
  retryPolicy: {
    maxAttempts: 2,
  },
  async execute(context) {
    return discoverProductCompetitors({
      productId: context.productId,
      product: context.product,
      summary: context.shared.summary ?? undefined,
      snapshot: context.shared.snapshot ?? undefined,
    })
  },
  serialize(result) {
    const data = toStageData(result)

    return {
      data,
      metrics: {
        competitorCount: data.competitors.length,
        model: data.model ?? null,
      },
      shared: {
        competitors: data,
      },
    }
  },
}
