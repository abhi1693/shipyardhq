"use server"

import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type AnalyticsTimeseriesPoint = {
  date: string
  label: string
  pageViews: number
  uniqueVisitors: number
}

export type AnalyticsReferrer = {
  referrer: string
  views: number
  share: number
}

export type AnalyticsBrowser = {
  browser: string
  visitors: number
  share: number
}

export type AnalyticsOperatingSystem = {
  os: string
  visitors: number
  share: number
}

export type AnalyticsDevice = {
  deviceCategory: string
  visitors: number
  share: number
}

export type AnalyticsCountry = {
  country: string
  code: string | null
  visitors: number
  share: number
}

export type AnalyticsRegion = {
  region: string
  country: string | null
  code: string | null
  visitors: number
  share: number
}

export type AnalyticsCity = {
  city: string
  region: string | null
  country: string | null
  code: string | null
  visitors: number
  share: number
}

export type AnalyticsTopProductPage = {
  path: string
  slug: string | null
  name: string | null
  upvotes: number | null
  pageViews: number
  uniqueVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  shareOfViews: number
}

export type AnalyticsSnapshot = {
  pageViews: number
  uniqueVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  newUsers: number
  engagementRate: number
  pagesPerSession: number
  referrers: AnalyticsReferrer[]
  timeseries: AnalyticsTimeseriesPoint[]
  browsers: AnalyticsBrowser[]
  operatingSystems: AnalyticsOperatingSystem[]
  devices: AnalyticsDevice[]
  countries: AnalyticsCountry[]
  regions: AnalyticsRegion[]
  cities: AnalyticsCity[]
  topProductPages: AnalyticsTopProductPage[]
}

export type AnalyticsVerifiedRevenue = {
  currency: string
  rangeCents: number
  previousRangeCents: number
}

export type PublicAnalyticsPayload = {
  snapshot: AnalyticsSnapshot
  previousSnapshot: AnalyticsSnapshot
  realtimeVisitors: number
  verifiedRevenue: AnalyticsVerifiedRevenue
}

const isFastApiNotFound = (error: unknown) => {
  const status = (error as FastApiError | undefined)?.status
  return status === 404 || status === 422
}

const buildPublicUrl = (
  path: string,
  params?: Record<string, string | number | null | undefined>,
) => {
  if (!params) return path
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || typeof value === "undefined") {
      return
    }
    const normalized = String(value)
    if (!normalized.length) {
      return
    }
    search.set(key, normalized)
  })
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

const fetchPublicAnalyticsPayload = async (options?: {
  topProductLimit?: number
}): Promise<PublicAnalyticsPayload> => {
  try {
    const response = await fastapiFetch<ApiResponse<PublicAnalyticsPayload>>(
      buildPublicUrl("/api/v1/public/analytics/summary", {
        topProductLimit: options?.topProductLimit,
      }),
      { method: "GET" },
    )
    if (response.status !== 200 || !response.data) {
      throw new Error("Failed to fetch analytics payload")
    }
    return response.data
  } catch (error) {
    if (isFastApiNotFound(error)) {
      throw new Error("Analytics payload not found")
    }
    throw error
  }
}

export const getPublicAnalyticsPayload = cached(
  async (options?: { topProductLimit?: number }) =>
    fetchPublicAnalyticsPayload(options),
  "analytics:public:payload",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.analytics],
    keyParts: ([options]) => [
      `topProductLimit:${options?.topProductLimit ?? "default"}`,
    ],
  },
)
