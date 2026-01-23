import type {
  AnalyticsProvider,
  AnalyticsProviderKey,
} from "@/lib/server/analytics/providerTypes"
import { gaAnalyticsProvider } from "@/lib/server/analytics/providers/ga"
import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"
import { cacheAnalyticsProvider } from "@/lib/server/analytics/providers/cache"

export const DEFAULT_ANALYTICS_PROVIDER: AnalyticsProviderKey = "cache"

export function getAnalyticsProvider(
  key: AnalyticsProviderKey = DEFAULT_ANALYTICS_PROVIDER,
): AnalyticsProvider {
  if (key === "cache") return cacheAnalyticsProvider
  return key === "db" ? dbAnalyticsProvider : gaAnalyticsProvider
}
