import { Skeleton } from "@/components/atoms/skeleton"

export default function ProductAnalyticsLoading() {
  return (
    <div
      className="space-y-6 py-2"
      role="status"
      aria-label="Loading product analytics"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-28" tone="soft" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <span className="sr-only">Loading analytics…</span>
    </div>
  )
}
