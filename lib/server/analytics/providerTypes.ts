import type {
  GaDateRange,
  GaProductTrafficSummary,
  SiteAnalyticsSnapshot,
  HomepageTraffic,
} from "@/lib/server/analytics/googleAnalytics"

export type AnalyticsDateRange = GaDateRange
export type ProductTrafficSummary = GaProductTrafficSummary

export type ProductTrafficMapEntry = {
  pageViews: number
  uniqueVisitors: number
  sessions: number
}

export type AnalyticsProviderKey = "ga4" | "db"

export type AnalyticsProvider = {
  getProductTraffic: (args: {
    pagePaths: string[]
    dateRange: AnalyticsDateRange
    includeAdvanced?: boolean
  }) => Promise<ProductTrafficSummary>
  getProductTrafficMap: (args: {
    products: Array<{ id: string; slug: string }>
    dateRange: AnalyticsDateRange
  }) => Promise<Map<string, ProductTrafficMapEntry>>
  getSiteAnalyticsSnapshot: (args?: {
    dateRange?: AnalyticsDateRange
    topProductLimit?: number
  }) => Promise<SiteAnalyticsSnapshot>
  getHomepageTraffic: () => Promise<HomepageTraffic>
  getRealtimeVisitors: () => Promise<number>
}
