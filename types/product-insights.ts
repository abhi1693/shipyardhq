import type {
  ProductInsightPageSnapshot,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"

export type ProductInsightStatus = "pending" | "ready" | "failed"

export type ProductInsightPipelineJobState = "idle" | "queued" | "active"

export type ProductInsightSubredditQuery = {
  query: string
  rationale?: string | null
  audience?: string | null
}

export type ProductInsightSubreddit = {
  id?: string | null
  name: string
  title?: string | null
  description?: string | null
  url: string
  subscribers?: number | null
  activeUserCount?: number | null
  over18?: boolean | null
  iconUrl?: string | null
  primaryTopic?: string | null
  score?: number | null
  matchedQueries?: string[] | null
  relevanceScore?: number | null
  relevanceReason?: string | null
}

export type ProductInsightRedditDiscussionQuery = {
  query: string
  rationale?: string | null
  targetSubreddit?: string | null
}

export type ProductInsightRedditComment = {
  id: string
  author?: string | null
  body: string
  score?: number | null
  createdAt?: string | null
  parentId?: string | null
  depth?: number | null
}

export type ProductInsightRedditThread = {
  id: string
  title: string
  url: string
  permalink: string
  subreddit: string
  author?: string | null
  score?: number | null
  numComments?: number | null
  createdAt?: string | null
  flairText?: string | null
  matchedQueries?: string[] | null
  topComments?: ProductInsightRedditComment[] | null
}

export type ProductInsightHarvestMode = "standard" | "deep"

export type ProductInsightRedditInsightItem = {
  insight: string
  sentiment?: "positive" | "negative" | "neutral" | null
  audience?: string | null
  evidence?: string[] | null
  references?: string[] | null
}

export type ProductInsightRedditInsightSection = {
  title: string
  description?: string | null
  items: ProductInsightRedditInsightItem[]
}

export type ProductInsightRedditInsightReport = {
  summary: string
  sections: ProductInsightRedditInsightSection[]
  recommendedFocus?: string[] | null
}

export type ProductInsightReportActionPriority =
  | "high"
  | "medium"
  | "low"
  | "watch"

export type ProductInsightReportActionTimeframe =
  | "immediate"
  | "near-term"
  | "long-term"

export type ProductInsightReportAction = {
  title: string
  description: string
  priority: ProductInsightReportActionPriority
  timeframe?: ProductInsightReportActionTimeframe | null
  rationale?: string | null
  successMetric?: string | null
  supportingSignals?: string[] | null
}

export type ProductInsightReportSection = {
  title: string
  summary?: string | null
  highlights: string[]
}

export type ProductInsightCommunityPlan = {
  objective: string
  targetSubreddits: string[]
  tactics: string[]
  successSignal?: string | null
}

export type ProductInsightReportDataSource = {
  label: string
  entries: string[]
}

export type ProductInsightComprehensiveReport = {
  executiveSummary: string
  headlineHighlights: string[]
  opportunityAreas: ProductInsightReportSection[]
  customerSignals: ProductInsightReportSection[]
  recommendedActions: ProductInsightReportAction[]
  communityPlan?: ProductInsightCommunityPlan[] | null
  metricsToWatch?: string[] | null
  supportingData?: ProductInsightReportDataSource[] | null
}

export type ProductInsightCompetitor = {
  name: string
  description?: string | null
  url?: string | null
  focusArea?: string | null
  differentiators?: string[] | null
  positioning?: string | null
  maturity?: "emerging" | "established" | "enterprise" | null
  strengths?: string[] | null
  weaknesses?: string[] | null
  source?: string | null
  similarityScore?: number | null
}

export type ProductInsightSnapshotStageData = {
  sitemapUrl?: string | null
  discoveredUrls?: string[] | null
  pages?: ProductInsightPageSnapshot[] | null
  summary?: ProductInsightSummary | null
  summaryText?: string | null
  model?: string | null
  fetchedAt?: string | null
}

export type ProductInsightCommunityStageData = {
  queries: ProductInsightSubredditQuery[]
  subreddits: ProductInsightSubreddit[]
  model?: string | null
  discoveredAt?: string | null
  queryCoverage?: number | null
  matchedQueryCount?: number | null
}

export type ProductInsightDiscussionStageData = {
  queries: ProductInsightRedditDiscussionQuery[]
  threads: ProductInsightRedditThread[]
  insights?: ProductInsightRedditInsightReport | null
  model?: string | null
  discoveredAt?: string | null
  mode?: ProductInsightHarvestMode | null
}

export type ProductInsightReportStageData = {
  report: ProductInsightComprehensiveReport
  model?: string | null
  generatedAt?: string | null
}

export type ProductInsightCompetitorStageData = {
  competitors: ProductInsightCompetitor[]
  model?: string | null
  generatedAt?: string | null
  researchNotes?: string[] | null
}

export type ProductInsightStageId =
  | "product.snapshot"
  | "product.competitors"
  | "reddit.communities"
  | "reddit.discussions"
  | "report.comprehensive"

export type ProductInsightStageRendererHint =
  | "snapshot"
  | "competitor-list"
  | "community-list"
  | "discussion-list"
  | "comprehensive-report"

export type ProductInsightStageSetId =
  | "default"
  | "snapshot-only"
  | "reddit-refresh"
  | "report-refresh"

export type ProductInsightStageSetDefinition = {
  id: ProductInsightStageSetId
  label: string
  description?: string
  stages: ProductInsightStageId[]
}

export type ProductInsightStageDefinition = {
  id: ProductInsightStageId
  order: number
  label: string
  description?: string
  providerType: string
  dependencies: ProductInsightStageId[]
  renderer: ProductInsightStageRendererHint
}

export type ProductInsightStageDataById = {
  "product.snapshot": ProductInsightSnapshotStageData
  "product.competitors": ProductInsightCompetitorStageData
  "reddit.communities": ProductInsightCommunityStageData
  "reddit.discussions": ProductInsightDiscussionStageData
  "report.comprehensive": ProductInsightReportStageData
}

export type ProductInsightStageMetrics = Record<string, unknown>

export type ProductInsightStageView<
  K extends ProductInsightStageId = ProductInsightStageId,
> = {
  stageId: K
  label: string
  providerType: string
  dependencies: ProductInsightStageId[]
  renderer: ProductInsightStageRendererHint
  status: ProductInsightStatus
  data: ProductInsightStageDataById[K] | null
  metrics: ProductInsightStageMetrics | null
  errorMessage?: string | null
  startedAt: string | null
  completedAt: string | null
}

export type ProductInsightStageViewAny =
  ProductInsightStageView<ProductInsightStageId>

export type ProductInsightStageViewMap = Partial<
  Record<ProductInsightStageId, ProductInsightStageViewAny>
>

export type ProductInsightProfilePayload = {
  id: string
  productId: string
  status: ProductInsightStatus
  errorMessage?: string | null
  lastRunAt: string | null
  stages: ProductInsightStageViewMap
  pipelineJobState?: ProductInsightPipelineJobState
  sitemapUrl?: string | null
  discoveredUrls?: string[] | null
  pages?: ProductInsightPageSnapshot[] | null
  summary?: ProductInsightSummary | null
  summaryText?: string | null
  model?: string | null
  competitors?: ProductInsightCompetitor[] | null
  competitorStatus?: ProductInsightStatus | null
  competitorErrorMessage?: string | null
  competitorModel?: string | null
  subredditQueries?: ProductInsightSubredditQuery[] | null
  subreddits?: ProductInsightSubreddit[] | null
  subredditStatus?: ProductInsightStatus | null
  subredditErrorMessage?: string | null
  subredditModel?: string | null
  redditDiscussionQueries?: ProductInsightRedditDiscussionQuery[] | null
  redditDiscussions?: ProductInsightRedditThread[] | null
  redditInsights?: ProductInsightRedditInsightReport | null
  redditStatus?: ProductInsightStatus | null
  redditErrorMessage?: string | null
  redditModel?: string | null
  redditMode?: ProductInsightHarvestMode | null
  finalReport?: ProductInsightComprehensiveReport | null
  finalReportStatus?: ProductInsightStatus | null
  finalReportErrorMessage?: string | null
  finalReportModel?: string | null
  lastCrawledAt: string | null
  lastCompetitorDiscoveryAt?: string | null
  lastSubredditDiscoveryAt: string | null
  lastRedditDiscoveryAt: string | null
  lastFinalReportAt: string | null
  competitorResearchNotes?: string[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type ProductInsightProfileView = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  insightProfile: ProductInsightProfilePayload | null
}

export type SerializedInsightProfile = ProductInsightProfilePayload
