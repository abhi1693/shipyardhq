import { AdminAnalyticsPageSkeleton } from "@/components/templates/admin/analytics/analytics-page.skeleton"

export default function Loading() {
  return (
    <AdminAnalyticsPageSkeleton
      metricCount={6}
      chartSections={[
        { variant: "line", legend: true, span: 2 },
        { variant: "bar" },
      ]}
      secondaryCharts={[
        { variant: "pie", legend: true },
        { variant: "bar" },
        { variant: "line" },
      ]}
      tableSections={[{ columns: 4, rows: 8 }, { columns: 5, rows: 6 }]}
      insightCardCount={2}
    />
  )
}
