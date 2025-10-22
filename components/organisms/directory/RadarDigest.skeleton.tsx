import * as React from "react"

import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

interface DirectoryRadarDigestSkeletonProps
  extends React.ComponentProps<"section"> {
  momentumCount?: number
}

export function DirectoryRadarDigestSkeleton({
  className,
  momentumCount = 5,
  ...props
}: DirectoryRadarDigestSkeletonProps) {
  const rows = Array.from({ length: Math.max(1, momentumCount) })

  return (
    <section
      className={
        "rounded-3xl border border-border bg-white p-6 shadow-sm" +
        (className ? ` ${className}` : "")
      }
      data-slot="directory-radar-digest-skeleton"
      {...props}
    >
      <div className="mb-6 space-y-2">
        <HeadingSkeleton lines={2} centered={false} />
        <Skeleton className="h-2.5 w-4/5 rounded-full" tone="muted" />
      </div>
      <ul className="space-y-4">
        {rows.map((_, index) => (
          <li
            // eslint-disable-next-line react/no-array-index-key -- decorative order only
            key={index}
            className="rounded-2xl border border-transparent px-3 py-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
                <Skeleton className="h-2 w-48 rounded-full" tone="muted" />
              </div>
              <div className="text-right">
                <Skeleton className="h-2 w-24 rounded-full" tone="muted" />
                <Skeleton className="mt-2 h-5 w-12 rounded-full" tone="brand" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key -- decorative order only
            key={index}
            className="rounded-2xl bg-muted/50 px-3 py-2"
          >
            <Skeleton className="mx-auto h-2 w-20 rounded-full" tone="muted" />
            <Skeleton
              className="mx-auto mt-2 h-5 w-16 rounded-full"
              tone="brand"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default DirectoryRadarDigestSkeleton
