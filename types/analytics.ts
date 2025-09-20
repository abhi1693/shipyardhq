export type DeviceCategory = "desktop" | "mobile" | "tablet" | "unknown"

export interface ProductTrafficPayload {
  productId: string
  path: string
  referrer?: string | null
  userAgent?: string | null
  device: DeviceCategory
  browser?: string | null
  os?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  ipHash?: string | null
}

export interface ProductTrafficSummaryPoint {
  date: string
  label: string
  views: number
  uniqueVisitors: number
}

export interface ProductEngagementSummaryPoint {
  date: string
  label: string
  clicks: number
  upvotes: number
}

export interface ProductTrafficBreakdownItem {
  views: number
}

export interface ProductTrafficDeviceBreakdownItem
  extends ProductTrafficBreakdownItem {
  device: DeviceCategory
  label: string
}

export interface ProductTrafficCountryBreakdownItem
  extends ProductTrafficBreakdownItem {
  country: string
}

export interface ProductTrafficBrowserBreakdownItem
  extends ProductTrafficBreakdownItem {
  browser: string
}

export interface ProductTrafficReferrerBreakdownItem
  extends ProductTrafficBreakdownItem {
  referrer: string
}

export type ProductTrafficReferrerCategory =
  | "direct"
  | "search"
  | "social"
  | "email"
  | "other"

export interface ProductTrafficPathBreakdownItem
  extends ProductTrafficBreakdownItem {
  path: string
  previousViews: number
  viewsChange: number
}

export interface ProductTrafficOsBreakdownItem
  extends ProductTrafficBreakdownItem {
  os: string
}

export interface ProductTrafficRegionBreakdownItem
  extends ProductTrafficBreakdownItem {
  country: string | null
  region: string
}

export interface ProductTrafficCityBreakdownItem
  extends ProductTrafficBreakdownItem {
  country: string | null
  region: string | null
  city: string
}

export interface ProductTrafficReferrerCategoryBreakdownItem
  extends ProductTrafficBreakdownItem {
  category: ProductTrafficReferrerCategory
  label: string
}

export interface ProductTrafficNewReturningBreakdown {
  newVisitors: number
  returningVisitors: number
  unknownVisitors: number
  returningRate: number
}

export type ProductTrafficAnomalyType = "ip-spike" | "path-surge" | "geo-surge"

export interface ProductTrafficAnomaly {
  type: ProductTrafficAnomalyType
  key: string
  description: string
  metric: string
  magnitude: number
  share?: number
}

export interface ProductTrafficReferrerMatrixProduct {
  productId: string
  productName?: string
  views: number
}

export interface ProductTrafficReferrerMatrixRow {
  referrer: string
  views: number
  topProducts: ProductTrafficReferrerMatrixProduct[]
}

export interface ProductTrafficTopProduct {
  productId: string
  productName?: string
  views: number
  share: number
}

export interface ProductTrafficAdvancedInsights {
  uniqueVisitorsOverTime: ProductTrafficSummaryPoint[]
  pathBreakdown: ProductTrafficPathBreakdownItem[]
  osBreakdown: ProductTrafficOsBreakdownItem[]
  regionBreakdown: ProductTrafficRegionBreakdownItem[]
  cityBreakdown: ProductTrafficCityBreakdownItem[]
  referrerCategoryBreakdown: ProductTrafficReferrerCategoryBreakdownItem[]
  newVsReturning: ProductTrafficNewReturningBreakdown
  anomalies: ProductTrafficAnomaly[]
  topProducts?: ProductTrafficTopProduct[]
  referrerProductMatrix?: ProductTrafficReferrerMatrixRow[]
}

export interface ProductTrafficSummary {
  rangeDays: number
  totalViews: number
  previousViews: number
  totalViewsChange: number
  uniqueVisitors: number
  previousUniqueVisitors: number
  uniqueVisitorsChange: number
  averageViewsPerDay: number
  viewsToday: number
  viewsSevenDays: number
  topCountry?: { country: string; views: number }
  topReferrer?: { referrer: string; views: number }
  viewsOverTime: ProductTrafficSummaryPoint[]
  deviceBreakdown: ProductTrafficDeviceBreakdownItem[]
  countryBreakdown: ProductTrafficCountryBreakdownItem[]
  browserBreakdown: ProductTrafficBrowserBreakdownItem[]
  referrerBreakdown: ProductTrafficReferrerBreakdownItem[]
  engagementOverTime: ProductEngagementSummaryPoint[]
  advanced: ProductTrafficAdvancedInsights
}

export interface OnboardingAnswerBreakdownItem {
  value: string
  label: string
  count: number
  percentage: number
}

export interface NewsletterIntentBreakdownItem {
  id: string
  label: string
  subscribed: number
  optedOut: number
  total: number
  subscribedPercentage: number
}

export interface OnboardingAnswersSummary {
  totalActiveUsers: number
  completedResponses: number
  completionRate: number
  pendingUsers: number
  completedLast7Days: number
  lastResponseAt: string | null
  roleIntentBreakdown: OnboardingAnswerBreakdownItem[]
  heardFromBreakdown: OnboardingAnswerBreakdownItem[]
  newsletterSubscribed: number
  newsletterOptedOut: number
  newsletterIntentBreakdown: NewsletterIntentBreakdownItem[]
}
