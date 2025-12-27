export type DeviceCategory = "desktop" | "mobile" | "tablet" | "unknown"

export interface ProductTrafficSummaryPoint {
  date: string
  label: string
  views: number
  uniqueVisitors: number
}

export interface ProductEngagementSummaryPoint {
  date: string
  label: string
  upvotes: number
}

export interface ProductTrafficBreakdownItem {
  views: number
}

export interface ProductTrafficDeviceBreakdownItem extends ProductTrafficBreakdownItem {
  device: DeviceCategory
  label: string
}

export interface ProductTrafficCountryBreakdownItem extends ProductTrafficBreakdownItem {
  country: string
}

export interface ProductTrafficBrowserBreakdownItem extends ProductTrafficBreakdownItem {
  browser: string
}

export interface ProductTrafficUserAgentBreakdownItem extends ProductTrafficBreakdownItem {
  browser: string | null
  os: string | null
  device: DeviceCategory
}

export interface ProductTrafficReferrerBreakdownItem extends ProductTrafficBreakdownItem {
  referrer: string
}

export type ProductTrafficReferrerCategory =
  | "direct"
  | "search"
  | "social"
  | "email"
  | "other"

export interface ProductTrafficPathBreakdownItem extends ProductTrafficBreakdownItem {
  path: string
  previousViews: number
  viewsChange: number
}

export interface ProductTrafficOsBreakdownItem extends ProductTrafficBreakdownItem {
  os: string
}

export interface ProductTrafficRegionBreakdownItem extends ProductTrafficBreakdownItem {
  country: string | null
  region: string
}

export interface ProductTrafficCityBreakdownItem extends ProductTrafficBreakdownItem {
  country: string | null
  region: string | null
  city: string
}

export interface ProductTrafficReferrerCategoryBreakdownItem extends ProductTrafficBreakdownItem {
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
  upvotesInRange: number
  previousUpvotes: number
  upvotesChange: number
  upvoteConversionRate: number
  upvoteConversionRateChange: number
  botViews: number
  previousBotViews: number
  topCountry?: { country: string; views: number }
  topReferrer?: { referrer: string; views: number }
  viewsOverTime: ProductTrafficSummaryPoint[]
  deviceBreakdown: ProductTrafficDeviceBreakdownItem[]
  countryBreakdown: ProductTrafficCountryBreakdownItem[]
  browserBreakdown: ProductTrafficBrowserBreakdownItem[]
  userAgentBreakdown: ProductTrafficUserAgentBreakdownItem[]
  referrerBreakdown: ProductTrafficReferrerBreakdownItem[]
  engagementOverTime: ProductEngagementSummaryPoint[]
  advanced: ProductTrafficAdvancedInsights
  filters: {
    includeBots: boolean
  }
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
  rangeDays: number
  totalActiveUsers: number
  completedResponses: number
  completionRate: number
  pendingUsers: number
  completedInRange: number
  lastResponseAt: string | null
  roleIntentBreakdown: OnboardingAnswerBreakdownItem[]
  heardFromBreakdown: OnboardingAnswerBreakdownItem[]
  newsletterSubscribed: number
  newsletterOptedOut: number
  newsletterIntentBreakdown: NewsletterIntentBreakdownItem[]
  newsletterRegisteredSubscribers: number
  newsletterRegisteredNotSubscribed: number
  newsletterUnregisteredSubscribers: number
  roleIntentOutcomes: OnboardingOutcomeDeltaItem[]
  heardFromOutcomes: OnboardingOutcomeDeltaItem[]
  signupTimeline: OnboardingSignupPoint[]
}

export interface OnboardingSignupPoint {
  date: string
  label: string
  signups: number
}

export interface OnboardingOutcomeDeltaItem {
  value: string
  label: string
  total: number
  productOwners: number
  productOwnerRate: number
  upvoters: number
  upvoterRate: number
  purchasers: number
  purchaserRate: number
  feedbackSubmitters: number
  feedbackSubmissionRate: number
  feedbackCount: number
  feedbackAverageRating: number | null
}

export type IntentOutcomeStageKey =
  | "shippedProduct"
  | "joinedOrganization"
  | "upvotedProduct"
  | "submittedFeedback"
  | "purchasedPlan"

export interface IntentOutcomeStageSpeedBucket {
  label: string
  thresholdDays: number
  count: number
  percentage: number
}

export interface IntentOutcomeStageMetrics {
  key: IntentOutcomeStageKey
  label: string
  description: string
  count: number
  percentage: number
  medianDaysToComplete: number | null
  speedBuckets: IntentOutcomeStageSpeedBucket[]
}

export interface IntentOutcomeRetentionBucket {
  thresholdDays: number
  label: string
  activeUsers: number
  percentage: number
}

export interface IntentOutcomeRetentionMetrics {
  thresholds: IntentOutcomeRetentionBucket[]
}

export interface IntentOutcomeCohort {
  id: string
  roleIntent: string | null
  roleIntentLabel: string
  heardFrom: string | null
  heardFromLabel: string
  totalUsers: number
  stageMetrics: IntentOutcomeStageMetrics[]
  retention: IntentOutcomeRetentionMetrics
}

export interface LeaderboardRangeProduct {
  id: string
  name: string
  slug: string
  tagline: string | null
  categoryName: string | null
  makerName: string
  rangeUpvotes: number
  previousUpvotes: number
  upvoteChange: number
  upvoteDelta: number
  totalUpvotes: number
  rank: number
  previousRank: number | null
  isNew: boolean
}

export interface LeaderboardRangeHistoryPoint {
  date: string
  label: string
  upvotes: number
  champion: number
  average: number
}

export interface LeaderboardRangeSummary {
  totalUpvotes: number
  previousUpvotes: number
  upvoteChange: number
  upvoteDelta: number
  uniqueProducts: number
  previousUniqueProducts: number
  newProducts: number
  returningProducts: number
  returningRate: number
  improvingProducts: number
  decliningProducts: number
  stableProducts: number
  championUpvotes: number | null
  championPreviousUpvotes: number | null
  championDelta: number | null
  averageDailyUpvotes: number
}

export interface LeaderboardRangeAnalytics {
  rangeDays: number
  summary: LeaderboardRangeSummary
  products: {
    top: LeaderboardRangeProduct[]
    surging: LeaderboardRangeProduct[]
    new: LeaderboardRangeProduct[]
  }
  history: LeaderboardRangeHistoryPoint[]
}

export interface IntentOutcomeSummary {
  totalUsers: number
  totalCohorts: number
  stageMetrics: IntentOutcomeStageMetrics[]
  retention: IntentOutcomeRetentionMetrics
}

export interface IntentOutcomeAnalytics {
  rangeDays: number
  generatedAt: string
  summary: IntentOutcomeSummary
  cohorts: IntentOutcomeCohort[]
}
