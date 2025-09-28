import type {
  ProductInsightCommunityStageData,
  ProductInsightDiscussionStageData,
  ProductInsightProfilePayload,
  ProductInsightReportStageData,
  ProductInsightStageDataById,
  ProductInsightStageId,
  ProductInsightStageMetrics,
  ProductInsightStageViewMap,
  ProductInsightSnapshotStageData,
} from "@/types/product-insights"
import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"

export type PipelineStageSharedState = {
  snapshot?: ProductInsightSnapshotStageData | null
  summary?: ProductInsightSummary | null
  summaryText?: string | null
  communities?: ProductInsightCommunityStageData | null
  discussions?: ProductInsightDiscussionStageData | null
  report?: ProductInsightReportStageData | null
}

export type PipelineStageContext = {
  productId: string
  websiteUrl: string
  product: ProductInsightProductContext
  profile: ProductInsightProfilePayload | null
  requestedByUserId?: string | null
  stageViews: ProductInsightStageViewMap
  shared: PipelineStageSharedState
}

export type StageRetryPolicy = {
  maxAttempts: number
  backoffMs?: number
}

export type PipelineStageSerialization<K extends ProductInsightStageId> = {
  data: ProductInsightStageDataById[K]
  metrics?: ProductInsightStageMetrics | null
  shared?: Partial<PipelineStageSharedState>
}

export interface PipelineStage<
  K extends ProductInsightStageId = ProductInsightStageId,
  TResult = unknown,
> {
  id: K
  providerType: string
  dependencies: ProductInsightStageId[]
  retryPolicy?: StageRetryPolicy
  execute(context: PipelineStageContext): Promise<TResult>
  serialize(
    result: TResult,
    context: PipelineStageContext,
  ): PipelineStageSerialization<K>
}
