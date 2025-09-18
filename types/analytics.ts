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
}
