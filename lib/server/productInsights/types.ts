export type ProductInsightPageSnapshot = {
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

export type ProductInsightCrawlResult = {
  baseUrl: string
  sitemapUrl?: string
  discoveredUrls: string[]
  fetchedAt: string
  pages: ProductInsightPageSnapshot[]
}

export type ProductInsightSummary = {
  overview: string
  valuePropositions: string[]
  targetUsers: string[]
  keyFeatures: string[]
  painPointsAddressed: string[]
  toneAndStyle: string[]
}

export type ProductInsightSynthesis = {
  summary: ProductInsightSummary
  model: string
}

export type ProductInsightProductContext = {
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

export type ProductInsightSnapshot = {
  crawl: ProductInsightCrawlResult
  synthesis: ProductInsightSynthesis
}

export type SitemapDiscovery = {
  sitemapUrl?: string
  urls: string[]
}

export type ProductInsightCrawlerOptions = {
  maxSitemaps: number
  maxPages: number
  pageFetchTimeoutMs: number
  userAgent: string
}

export const DEFAULT_CRAWLER_OPTIONS: ProductInsightCrawlerOptions = {
  maxSitemaps: 4,
  maxPages: 20,
  pageFetchTimeoutMs: 12000,
  userAgent: "ShipyardHQ-ProductInsights/1.0",
}
