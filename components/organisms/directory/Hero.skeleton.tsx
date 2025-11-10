import * as React from "react"

import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface HeroSkeletonProps extends React.ComponentProps<"div"> {
  metricCount?: number
  showSecondary?: boolean
  showPrimary?: boolean
}

export function HeroSkeleton({
  className,
  metricCount = 4,
  showPrimary = true,
  showSecondary = true,
  ...props
}: HeroSkeletonProps) {
  const metrics = Array.from({ length: Math.max(0, metricCount) })
  const hasMetrics = metrics.length > 0

  return (
    <div
      className={cn("space-y-6", className)}
      data-slot="hero-skeleton"
      {...props}
    >
      <section className="flex flex-col rounded-[28px] border border-border/70 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.28)] sm:p-12">
        <div className="flex justify-center">
          <BadgeSkeleton
            variant="outline"
            leadingIcon
            labelWidth="8rem"
            className="h-8 rounded-full border-border/80 bg-muted/40 px-4"
          />
        </div>
        <div className="space-y-4 text-balance text-center">
          <HeadingSkeleton
            lines={2}
            centered
            className="text-4xl font-semibold sm:text-[2.4rem]"
          />
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
            <Skeleton className="h-4 w-full rounded-full" tone="muted" />
            <Skeleton className="h-4 w-11/12 rounded-full" tone="muted" />
            <Skeleton className="h-4 w-3/5 rounded-full" tone="muted" />
          </div>
        </div>
        {(showPrimary || showSecondary) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {showPrimary ? (
              <ButtonSkeleton size="lg" labelWidth="12rem" icon />
            ) : null}
            {showSecondary ? (
              <ButtonSkeleton
                size="lg"
                variant="outline"
                labelWidth="12rem"
                icon
              />
            ) : null}
          </div>
        )}
        {hasMetrics ? (
          <div className="grid gap-4 border-t border-border/60 pt-6 text-center sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/60 bg-white px-5 py-4 shadow-sm"
              >
                <Skeleton
                  className="mx-auto h-3 w-24 rounded-full"
                  tone="muted"
                />
                <Skeleton
                  className="mx-auto mt-3 h-6 w-20 rounded-full"
                  tone="brand"
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default HeroSkeleton
