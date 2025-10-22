import { AdminAnalyticsPageSkeleton } from "@/components/templates/admin/analytics/analytics-page.skeleton"

export default function Loading() {
  return (
    <AdminAnalyticsPageSkeleton
      metricCount={3}
      chartSections={[
        { variant: "line", legend: true, span: 2 },
        { variant: "bar" },
      ]}
      secondaryCharts={[
        { variant: "pie", legend: true },
        { variant: "bar" },
      ]}
      tableSections={[{ columns: 4, rows: 5 }]}
      insightCardCount={1}
    />
  )
}
