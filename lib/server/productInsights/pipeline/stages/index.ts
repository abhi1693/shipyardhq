import type { ProductInsightStageId } from "@/types/product-insights"
import type { PipelineStage } from "../types"
import { productSnapshotStage } from "./productSnapshotStage"
import { redditCommunitiesStage } from "./redditCommunitiesStage"
import { redditDiscussionsStage } from "./redditDiscussionsStage"
import { reportComprehensiveStage } from "./reportComprehensiveStage"

export const PIPELINE_STAGES_IN_ORDER: PipelineStage[] = [
  productSnapshotStage,
  redditCommunitiesStage,
  redditDiscussionsStage,
  reportComprehensiveStage,
]

export const PIPELINE_STAGE_REGISTRY = Object.fromEntries(
  PIPELINE_STAGES_IN_ORDER.map((stage) => [stage.id, stage]),
) as Record<ProductInsightStageId, PipelineStage>
