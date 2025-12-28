import type { AnalyticsProvider } from "@/lib/server/analytics/providerTypes"
import {
  getHomepageTrafficFromGa,
  getProductTrafficFromGa,
  getProductTrafficMapFromGa,
  getRealtimeVisitorsFromGa,
  getSiteAnalyticsSnapshot,
} from "@/lib/server/analytics/googleAnalytics"

export const gaAnalyticsProvider: AnalyticsProvider = {
  getProductTraffic: (args) => getProductTrafficFromGa(args),
  getProductTrafficMap: (args) => getProductTrafficMapFromGa(args),
  getSiteAnalyticsSnapshot: (args) => getSiteAnalyticsSnapshot(args),
  getHomepageTraffic: () => getHomepageTrafficFromGa(),
  getRealtimeVisitors: () => getRealtimeVisitorsFromGa(),
}

export function createGaAnalyticsProvider(): AnalyticsProvider {
  return gaAnalyticsProvider
}
