import * as React from "react"

import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface DirectoryHeaderSkeletonProps extends React.ComponentProps<"div"> {
  metricCount?: number
  showSecondary?: boolean
  showPrimary?: boolean
}

export function DirectoryHeaderSkeleton({
  className,
  metricCount = 4,
  showPrimary = true,
  showSecondary = true,
  ...props
}: DirectoryHeaderSkeletonProps) {
  const metrics = Array.from({ length: Math.max(1, metricCount) })

  return (
    <div
      className={cn("space-y-6", className)}
      data-slot="directory-header-skeleton"
      {...props}
    >
      <section className="relative overflow-hidden rounded-3xl border border-border px-6 py-12 shadow-sm md:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <BadgeSkeleton
              variant="outline"
              labelWidth="10rem"
              leadingIcon
              className="h-8 w-fit bg-white/10 text-white"
            />
            <div className="space-y-3">
              <HeadingSkeleton lines={2} centered={false} className="text-left" />
              <Skeleton
                className="h-3 w-4/5 rounded-full"
                tone="muted"
              />
              <Skeleton
                className="h-3 w-3/4 rounded-full"
                tone="muted"
              />
            </div>
            {(showPrimary || showSecondary) && (
              <div className="flex flex-wrap items-center gap-3">
                {showPrimary && (
                  <ButtonSkeleton
                    size="lg"
                    labelWidth="9rem"
                    icon
                  />
                )}
                {showSecondary && (
                  <ButtonSkeleton
                    size="lg"
                    variant="outline"
                    labelWidth="11rem"
                  />
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-2">
            {metrics.map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key -- decorative order
                key={index}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
              >
                <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
                <Skeleton className="mt-4 h-5 w-20 rounded-full" tone="brand" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <Skeleton className="h-16 w-full rounded-2xl" tone="soft" shimmer={false} />
    </div>
  )
}

export default DirectoryHeaderSkeleton
