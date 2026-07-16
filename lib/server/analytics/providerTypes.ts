export type AnalyticsDateRange = {
  startDate: string
  endDate: string
}

export type HomepageTraffic = {
  windowDays: number
  pageViews: number
  visitors: number
  trafficSeries: Array<{
    date: string
    pageViews: number
    visitors: number
  }>
}

export type ProductTrafficSummary = {
  pageViews: number
  uniqueVisitors: number
  newUsers: number
  returningVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  browsers: Array<{ browser: string; visitors: number }>
  operatingSystems: Array<{ os: string; visitors: number }>
  countries: Array<{
    country: string
    code?: string | null
    visitors: number
    share: number
  }>
  cities: Array<{
    city: string
    region?: string | null
    country?: string | null
    code?: string | null
    visitors: number
  }>
  devices: Array<{ deviceCategory: string; visitors: number }>
  timeseries: Array<{
    date: string
    label: string
    pageViews: number
    uniqueVisitors: number
  }>
}

export type SiteAnalyticsSnapshot = {
  pageViews: number
  uniqueVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  newUsers: number
  engagementRate: number
  pagesPerSession: number
  timeseries: Array<{
    date: string
    label: string
    pageViews: number
    uniqueVisitors: number
  }>
  browsers: Array<{ browser: string; visitors: number; share: number }>
  operatingSystems: Array<{ os: string; visitors: number; share: number }>
  devices: Array<{
    deviceCategory: string
    visitors: number
    share: number
  }>
  countries: Array<{
    country: string
    code?: string | null
    visitors: number
    share: number
  }>
  regions: Array<{
    region: string
    country?: string | null
    code?: string | null
    visitors: number
    share: number
  }>
  cities: Array<{
    city: string
    region?: string | null
    country?: string | null
    code?: string | null
    visitors: number
    share: number
  }>
  hourlyActivity: Array<{
    weekday: number
    weekdayLabel: string
    hour: number
    requests: number
    visits: number
  }>
  aiCrawlerAttention: {
    totalRequests: number
    shareOfTraffic: number
    successfulRequests: number
    successRate: number
    categories: Array<{
      category: string
      requests: number
      share: number
    }>
    crawlStatuses: Array<{
      status: string
      requests: number
      share: number
    }>
    responseStatuses: Array<{
      key: string
      label: string
      requests: number
      share: number
    }>
    endpoints: Array<{
      endpoint: string
      requests: number
      share: number
      matchedEndpoints: string[]
      managedLabels: string[]
    }>
  }
  trafficComposition: {
    totalRequests: number
    browserRequests: number
    verifiedAutomatedRequests: number
    otherRequests: number
    verifiedCategories: Array<{
      category: string
      requests: number
      share: number
    }>
  }
  topProductPages: Array<{
    path: string
    slug: string | null
    pageViews: number
    uniqueVisitors: number
    sessions: number
    bounceRate: number
    averageSessionDuration: number
    shareOfViews: number
  }>
}

export type ProductTrafficMapEntry = {
  pageViews: number
  uniqueVisitors: number
  sessions: number
}

export type AnalyticsProviderKey = "db" | "cache"

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
}
