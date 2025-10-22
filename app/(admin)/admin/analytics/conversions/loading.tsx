import { AdminAnalyticsPageSkeleton } from "@/components/templates/admin/analytics/analytics-page.skeleton"

export default function Loading() {
  return (
    <AdminAnalyticsPageSkeleton
      metricCount={4}
      chartSections={[
        { variant: "line", legend: true, span: 2 },
        { variant: "bar" },
      ]}
      secondaryCharts={[
        { variant: "pie", legend: true },
        { variant: "bar" },
      ]}
      tableSections={[{ columns: 5, rows: 6 }]}
      insightCardCount={1}
    />
  )
}
