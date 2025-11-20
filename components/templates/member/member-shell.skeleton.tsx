import { Skeleton } from "@/components/atoms/skeleton"

export function MemberAreaSkeleton() {
  return (
    <div
      className="space-y-8"
      data-slot="member-area-skeleton"
      aria-busy="true"
      aria-label="Loading member area"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-full" tone="muted" />
          <Skeleton className="h-6 w-60 rounded-full" tone="soft" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-full" tone="soft" />
          <Skeleton className="h-9 w-24 rounded-full" tone="soft" />
          <Skeleton className="h-9 w-32 rounded-full" tone="soft" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={`member-stat-skeleton-${index}`}
            className="h-28 rounded-2xl border border-border bg-white"
            tone="soft"
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton
          className="h-80 rounded-2xl border border-border bg-white"
          tone="soft"
        />
        <Skeleton
          className="h-80 rounded-2xl border border-border bg-white"
          tone="soft"
        />
      </div>

      <Skeleton
        className="h-28 rounded-2xl border border-border bg-white"
        tone="soft"
      />
    </div>
  )
}
