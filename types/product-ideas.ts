import type {
  ProductIdeaPageSnapshot,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"

export type ProductIdeaProfileStatus = "pending" | "ready" | "failed"

export type ProductIdeaPipelineJobState = "idle" | "queued" | "active"

export type ProductIdeaSubredditQuery = {
  query: string
  rationale?: string | null
  audience?: string | null
}

export type ProductIdeaSubreddit = {
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

export type SerializedIdeaProfile = {
  id: string
  productId: string
  sitemapUrl?: string | null
  discoveredUrls?: string[] | null
  pages?: ProductIdeaPageSnapshot[] | null
  summary?: ProductIdeaSummary | null
  summaryText?: string | null
  status: ProductIdeaProfileStatus
  errorMessage?: string | null
  model?: string | null
  subredditQueries?: ProductIdeaSubredditQuery[] | null
  subreddits?: ProductIdeaSubreddit[] | null
  subredditStatus?: ProductIdeaProfileStatus | null
  subredditErrorMessage?: string | null
  subredditModel?: string | null
  redditDiscussionQueries?: ProductIdeaRedditDiscussionQuery[] | null
  redditDiscussions?: ProductIdeaRedditThread[] | null
  redditInsights?: ProductIdeaRedditInsightReport | null
  redditStatus?: ProductIdeaProfileStatus | null
  redditErrorMessage?: string | null
  redditModel?: string | null
  finalReport?: ProductIdeaComprehensiveReport | null
  finalReportStatus?: ProductIdeaProfileStatus | null
  finalReportErrorMessage?: string | null
  finalReportModel?: string | null
  lastCrawledAt: string | null
  lastSubredditDiscoveryAt: string | null
  lastRedditDiscoveryAt: string | null
  lastFinalReportAt: string | null
  createdAt: string
  updatedAt: string
  pipelineJobState?: ProductIdeaPipelineJobState
}

export type ProductIdeaProfileView = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  ideaProfile: SerializedIdeaProfile | null
}

export type ProductIdeaRedditDiscussionQuery = {
  query: string
  rationale?: string | null
  targetSubreddit?: string | null
}

export type ProductIdeaRedditComment = {
  id: string
  author?: string | null
  body: string
  score?: number | null
  createdAt?: string | null
}

export type ProductIdeaRedditThread = {
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
  topComments?: ProductIdeaRedditComment[] | null
}

export type ProductIdeaRedditInsightItem = {
  insight: string
  sentiment?: "positive" | "negative" | "neutral" | null
  audience?: string | null
  evidence?: string[] | null
  references?: string[] | null
}

export type ProductIdeaRedditInsightSection = {
  title: string
  description?: string | null
  items: ProductIdeaRedditInsightItem[]
}

export type ProductIdeaRedditInsightReport = {
  summary: string
  sections: ProductIdeaRedditInsightSection[]
  recommendedFocus?: string[] | null
}

export type ProductIdeaReportActionPriority =
  | "high"
  | "medium"
  | "low"
  | "watch"

export type ProductIdeaReportActionTimeframe =
  | "immediate"
  | "near-term"
  | "long-term"

export type ProductIdeaReportAction = {
  title: string
  description: string
  priority: ProductIdeaReportActionPriority
  timeframe?: ProductIdeaReportActionTimeframe | null
  rationale?: string | null
  successMetric?: string | null
  supportingSignals?: string[] | null
}

export type ProductIdeaReportSection = {
  title: string
  summary?: string | null
  highlights: string[]
}

export type ProductIdeaCommunityPlan = {
  objective: string
  targetSubreddits: string[]
  tactics: string[]
  successSignal?: string | null
}

export type ProductIdeaReportDataSource = {
  label: string
  entries: string[]
}

export type ProductIdeaComprehensiveReport = {
  executiveSummary: string
  headlineHighlights: string[]
  opportunityAreas: ProductIdeaReportSection[]
  customerSignals: ProductIdeaReportSection[]
  recommendedActions: ProductIdeaReportAction[]
  communityPlan?: ProductIdeaCommunityPlan[] | null
  metricsToWatch?: string[] | null
  supportingData?: ProductIdeaReportDataSource[] | null
}
