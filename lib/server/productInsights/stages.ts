import type {
  ProductInsightStageDefinition,
  ProductInsightStageId,
  ProductInsightStageSetDefinition,
  ProductInsightStageSetId,
} from "@/types/product-insights"
import {
  PIPELINE_STAGE_REGISTRY,
  PIPELINE_STAGES_IN_ORDER,
} from "@/lib/server/productInsights/pipeline/stages"

const STAGE_RENDER_METADATA: Array<{
  id: ProductInsightStageId
  order: number
  label: string
  description: string
  renderer: ProductInsightStageDefinition["renderer"]
}> = [
  {
    id: "product.snapshot",
    order: 10,
    label: "Product Snapshot",
    description: "Website crawl and product summary",
    renderer: "snapshot",
  },
  {
    id: "product.competitors",
    order: 20,
    label: "Competitor Landscape",
    description: "Identify direct and adjacent competitors",
    renderer: "competitor-list",
  },
  {
    id: "reddit.communities",
    order: 30,
    label: "Reddit Communities",
    description: "Subreddit discovery and ranking",
    renderer: "community-list",
  },
  {
    id: "reddit.discussions",
    order: 40,
    label: "Reddit Discussions",
    description: "Relevant threads and insights",
    renderer: "discussion-list",
  },
  {
    id: "hackernews.discussions",
    order: 45,
    label: "Hacker News Mentions",
    description: "Recent launches, threads, and sentiment from Hacker News",
    renderer: "hackernews-list",
  },
  {
    id: "report.comprehensive",
    order: 50,
    label: "Comprehensive Insight Report",
    description: "Exec summary and recommended actions",
    renderer: "comprehensive-report",
  },
]

export const PRODUCT_INSIGHT_STAGE_DEFINITIONS: ProductInsightStageDefinition[] =
  STAGE_RENDER_METADATA.map((metadata) => {
    const runtimeStage = PIPELINE_STAGE_REGISTRY[metadata.id]
    if (!runtimeStage) {
      throw new Error(`Missing runtime stage for ${metadata.id}`)
    }
    return {
      ...metadata,
      providerType: runtimeStage.providerType,
      dependencies: runtimeStage.dependencies,
    }
  })

export const PRODUCT_INSIGHT_STAGE_MAP = Object.fromEntries(
  PRODUCT_INSIGHT_STAGE_DEFINITIONS.map((definition) => [
    definition.id,
    definition,
  ]),
) as Record<ProductInsightStageId, ProductInsightStageDefinition>

export const PRODUCT_INSIGHT_STAGE_SETS: ProductInsightStageSetDefinition[] = [
  {
    id: "default",
    label: "Full Pipeline",
    description: "Run all configured insight stages",
    stages: PIPELINE_STAGES_IN_ORDER.map(
      (stage) => stage.id as ProductInsightStageId,
    ),
  },
  {
    id: "snapshot-only",
    label: "Product Snapshot Refresh",
    description: "Refresh the website crawl and summary only",
    stages: ["product.snapshot", "product.competitors"],
  },
  {
    id: "reddit-refresh",
    label: "Community Intelligence Refresh",
    description:
      "Rebuild Reddit communities, discussions, Hacker News mentions, and regenerate the report",
    stages: [
      "reddit.communities",
      "reddit.discussions",
      "hackernews.discussions",
      "report.comprehensive",
    ],
  },
  {
    id: "report-refresh",
    label: "Comprehensive Report Refresh",
    description: "Regenerate the insights report using existing discovery data",
    stages: ["report.comprehensive"],
  },
]

export const PRODUCT_INSIGHT_STAGE_SET_MAP = Object.fromEntries(
  PRODUCT_INSIGHT_STAGE_SETS.map((definition) => [definition.id, definition]),
) as Record<ProductInsightStageSetId, ProductInsightStageSetDefinition>
