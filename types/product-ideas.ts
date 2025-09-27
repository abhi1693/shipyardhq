import type {
  ProductIdeaPageSnapshot,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"

export type ProductIdeaProfileStatus = "pending" | "ready" | "failed"

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
  lastCrawledAt: string | null
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
