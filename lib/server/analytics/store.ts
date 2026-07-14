import type {
  AnalyticsProvider,
  AnalyticsProviderKey,
} from "@/lib/server/analytics/providerTypes"
import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"
import { cacheAnalyticsProvider } from "@/lib/server/analytics/providers/cache"

export const DEFAULT_ANALYTICS_PROVIDER: AnalyticsProviderKey = "cache"

export function getAnalyticsProvider(
  key: AnalyticsProviderKey = DEFAULT_ANALYTICS_PROVIDER,
): AnalyticsProvider {
  return key === "db" ? dbAnalyticsProvider : cacheAnalyticsProvider
}
