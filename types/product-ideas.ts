import type {
  ProductIdeaPageSnapshot,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"

export type ProductIdeaProfileStatus = "pending" | "ready" | "failed"

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
  lastCrawledAt: string | null
  lastSubredditDiscoveryAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProductIdeaProfileView = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  ideaProfile: SerializedIdeaProfile | null
}
