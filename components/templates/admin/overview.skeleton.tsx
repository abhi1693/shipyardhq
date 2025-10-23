import * as React from "react"

import { Skeleton } from "@/components/atoms/skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { RangeSelectorSkeleton } from "@/components/molecules/RangeSelector.skeleton"
import { cn } from "@/lib/utils"

function MetricTileSkeleton() {
  return (
    <Skeleton
      tone="soft"
      radius="lg"
      shimmer={false}
      inset
      className="space-y-3 border border-white/30 p-5 shadow-sm"
    >
      <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton
        className="h-2 w-16 rounded-full"
        tone="muted"
        shimmer={false}
      />
    </Skeleton>
  )
}

function ActivityListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div
           
          key={index}
          className="space-y-2 rounded-xl border border-white/25 p-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-2.5 w-32 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" tone="soft" />
              <Skeleton className="h-5 w-20 rounded-full" tone="soft" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Skeleton className="h-2 w-24 rounded-full" tone="muted" />
            <Skeleton className="h-2 w-20 rounded-full" tone="muted" />
            <Skeleton className="h-2 w-28 rounded-full" tone="muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

type AdminOverviewSkeletonProps = React.ComponentProps<"div">

export function AdminOverviewSkeleton({
  className,
  ...props
}: AdminOverviewSkeletonProps) {
  return (
    <div
      className={cn("space-y-10", className)}
      data-slot="admin-overview-skeleton"
      aria-hidden="true"
      {...props}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <HeadingSkeleton lines={2} />
          <Skeleton
            className="h-2.5 w-72 max-w-full rounded-full"
            tone="muted"
            shimmer={false}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <RangeSelectorSkeleton />
          <ButtonSkeleton size="sm" variant="outline" labelWidth="7rem" />
        </div>
      </header>

      <section className="space-y-4">
        <Skeleton className="h-2.5 w-36 rounded-full" tone="muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <MetricTileSkeleton key={index} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-2.5 w-44 rounded-full" tone="muted" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton
               
              key={index}
              lines={5}
              showFooter={false}
              actionWidth="5.5rem"
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-2.5 w-40 rounded-full" tone="muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton
            tone="soft"
            radius="lg"
            shimmer={false}
            inset
            className="space-y-4 border border-white/30 p-6"
          >
            <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
            <ActivityListSkeleton items={4} />
            <ButtonSkeleton
              size="sm"
              variant="ghost"
              labelWidth="6.5rem"
              className="self-start"
            />
          </Skeleton>
          <Skeleton
            tone="soft"
            radius="lg"
            shimmer={false}
            inset
            className="space-y-4 border border-white/30 p-6"
          >
            <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
            <ActivityListSkeleton items={4} />
            <ButtonSkeleton
              size="sm"
              variant="ghost"
              labelWidth="6.5rem"
              className="self-start"
            />
          </Skeleton>
        </div>
      </section>
    </div>
  )
}
