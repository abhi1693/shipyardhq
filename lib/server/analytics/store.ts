import type {
  AnalyticsProvider,
  AnalyticsProviderKey,
} from "@/lib/server/analytics/providerTypes"
import { gaAnalyticsProvider } from "@/lib/server/analytics/providers/ga"
import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"

export const DEFAULT_ANALYTICS_PROVIDER: AnalyticsProviderKey = "ga4"

export function getAnalyticsProvider(
  key: AnalyticsProviderKey = DEFAULT_ANALYTICS_PROVIDER,
): AnalyticsProvider {
  return key === "db" ? dbAnalyticsProvider : gaAnalyticsProvider
}
