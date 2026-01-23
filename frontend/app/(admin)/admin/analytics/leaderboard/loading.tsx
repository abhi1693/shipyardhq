import { AdminAnalyticsPageSkeleton } from "@/components/templates/admin/analytics/analytics-page.skeleton"

export default function Loading() {
  return (
    <AdminAnalyticsPageSkeleton
      metricCount={4}
      chartSections={[{ variant: "bar", legend: true, span: 2 }]}
      secondaryCharts={[
        { variant: "line", legend: true },
        { variant: "pie", legend: true },
      ]}
      tableSections={[{ columns: 5, rows: 10 }]}
      insightCardCount={2}
    />
  )
}
