import { AdminAnalyticsPageSkeleton } from "@/components/templates/admin/analytics/analytics-page.skeleton"

export default function Loading() {
  return (
    <AdminAnalyticsPageSkeleton
      metricCount={4}
      chartSections={[{ variant: "line", legend: true, span: 2 }]}
      secondaryCharts={[{ variant: "bar" }, { variant: "pie", legend: true }]}
      tableSections={[{ columns: 5, rows: 8 }]}
      insightCardCount={1}
    />
  )
}
