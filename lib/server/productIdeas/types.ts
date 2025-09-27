export type ProductIdeaPageSnapshot = {
  url: string
  status: "ok" | "error"
  statusCode?: number
  finalUrl?: string
  contentType?: string | null
  fetchedAt: string
  fetchDurationMs?: number
  title?: string
  metaDescription?: string
  ogTitle?: string
  ogDescription?: string
  twitterTitle?: string
  twitterDescription?: string
  keywords?: string[]
  headings?: string[]
  textSnippet?: string
  rawTextLength?: number
  contentHash?: string
  metadata?: Record<string, string>
  jsonLd?: unknown[]
  error?: string
}

export type ProductIdeaCrawlResult = {
  baseUrl: string
  sitemapUrl?: string
  discoveredUrls: string[]
  fetchedAt: string
  pages: ProductIdeaPageSnapshot[]
}

export type ProductIdeaSummary = {
  overview: string
  valuePropositions: string[]
  targetUsers: string[]
  keyFeatures: string[]
  painPointsAddressed: string[]
  toneAndStyle: string[]
}

export type ProductIdeaSynthesis = {
  summary: ProductIdeaSummary
  model: string
}

export type ProductIdeaProductContext = {
  name: string
  tagline?: string | null
  description?: string | null
  pricingModel?: string | null
  startingPriceCents?: number | null
  currencyCode?: string | null
  type?: string | null
  keywords?: string[]
  platforms?: string[]
}

export type ProductIdeaSnapshot = {
  crawl: ProductIdeaCrawlResult
  synthesis: ProductIdeaSynthesis
}

export type SitemapDiscovery = {
  sitemapUrl?: string
  urls: string[]
}

export type ProductIdeaCrawlerOptions = {
  maxSitemaps: number
  maxPages: number
  pageFetchTimeoutMs: number
  userAgent: string
}

export const DEFAULT_CRAWLER_OPTIONS: ProductIdeaCrawlerOptions = {
  maxSitemaps: 4,
  maxPages: 20,
  pageFetchTimeoutMs: 12000,
  userAgent: "ShipyardHQ-ProductIdeas/1.0",
}
