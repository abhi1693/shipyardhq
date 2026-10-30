import {
  ANALYTICS_METRICS,
  trafficScopeDescription,
} from "@/lib/analytics/metric-definitions"

export function AnalyticsMetricDefinitions({
  windowLabel,
  scope = "listing",
  includeClicks = true,
}: {
  windowLabel: string
  scope?: "site" | "listing"
  includeClicks?: boolean
}) {
  return (
    <div
      className="mt-4 space-y-2 text-xs leading-5 text-[#475569]"
      aria-label="Metric definitions"
    >
      <p>
        Traffic reporting period: {windowLabel}.{" "}
        {trafficScopeDescription(scope)} {ANALYTICS_METRICS.visits.description}
      </p>
      {includeClicks ? (
        <p>
          {ANALYTICS_METRICS.websiteClicks.label}:{" "}
          {ANALYTICS_METRICS.websiteClicks.description}
        </p>
      ) : null}
    </div>
  )
}
