import type {
  ProductInsightStageDefinition,
  ProductInsightStageId,
} from "@/types/product-insights"

export const PRODUCT_INSIGHT_STAGE_DEFINITIONS: ProductInsightStageDefinition[] = [
  {
    id: "product.snapshot",
    order: 10,
    label: "Product Snapshot",
    description: "Website crawl and product summary",
    providerType: "shipyard:web",
    dependencies: [],
    renderer: "snapshot",
  },
  {
    id: "reddit.communities",
    order: 20,
    label: "Reddit Communities",
    description: "Subreddit discovery and ranking",
    providerType: "reddit",
    dependencies: ["product.snapshot"],
    renderer: "community-list",
  },
  {
    id: "reddit.discussions",
    order: 30,
    label: "Reddit Discussions",
    description: "Relevant threads and insights",
    providerType: "reddit",
    dependencies: ["product.snapshot", "reddit.communities"],
    renderer: "discussion-list",
  },
  {
    id: "report.comprehensive",
    order: 40,
    label: "Comprehensive Insight Report",
    description: "Exec summary and recommended actions",
    providerType: "shipyard:model",
    dependencies: ["product.snapshot", "reddit.discussions"],
    renderer: "comprehensive-report",
  },
]

export const PRODUCT_INSIGHT_STAGE_MAP = Object.fromEntries(
  PRODUCT_INSIGHT_STAGE_DEFINITIONS.map((definition) => [
    definition.id,
    definition,
  ]),
) as Record<ProductInsightStageId, ProductInsightStageDefinition>
