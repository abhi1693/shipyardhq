import { AdminAnalyticsPageSkeleton } from "@/components/templates/admin/analytics/analytics-page.skeleton"

export default function Loading() {
  return (
    <AdminAnalyticsPageSkeleton
      metricCount={3}
      chartSections={[
        { variant: "line", legend: true, span: 2 },
        { variant: "bar", legend: true },
      ]}
      secondaryCharts={[
        { variant: "radar" },
        { variant: "pie", legend: true },
        { variant: "bar" },
      ]}
      tableSections={[{ columns: 5, rows: 7 }]}
      insightCardCount={2}
    />
  )
}
