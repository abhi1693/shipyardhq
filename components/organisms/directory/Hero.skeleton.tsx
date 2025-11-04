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
      className={cn("space-y-8", className)}
      data-slot="hero-skeleton"
      {...props}
    >
      <section className="relative overflow-hidden rounded-[32px] border border-[#E4E8F5] bg-white px-6 py-12 shadow-[0_45px_140px_-80px_rgba(28,35,51,0.65)] md:px-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="space-y-8">
            <BadgeSkeleton
              variant="outline"
              labelWidth="11rem"
              leadingIcon
              className="h-9 w-fit rounded-full bg-[#E8EDFB] text-[#344074]"
            />
            <div className="space-y-6">
              <HeadingSkeleton
                lines={2}
                centered={false}
                className="text-left text-4xl sm:text-5xl"
              />
              <div className="space-y-3">
                <Skeleton className="h-4 w-4/5 rounded-full" tone="muted" />
                <Skeleton className="h-4 w-3/5 rounded-full" tone="muted" />
              </div>
            </div>
            {(showPrimary || showSecondary) && (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {showPrimary && (
                  <ButtonSkeleton size="lg" labelWidth="10rem" icon />
                )}
                {showSecondary && (
                  <ButtonSkeleton
                    size="lg"
                    variant="outline"
                    labelWidth="12rem"
                  />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Skeleton className="h-3 w-48 rounded-full" tone="brand" />
              <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
            </div>
          </div>
          <div className="relative lg:ml-auto">
            <div className="absolute inset-0 -translate-y-20 scale-[1.2] rounded-[40px] bg-gradient-to-br from-[#EEF3FF] via-[#FFFFFF] to-[#E6FCFF] blur-3xl" />
            <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 rounded-[36px] border border-[#E0E7F8] bg-[#FBFCFF] p-8 shadow-[0_40px_120px_-70px_rgba(28,35,51,0.65)] lg:ml-auto lg:mr-0">
              <Skeleton
                className="h-10 w-40 rounded-full bg-[#F4EEFE]"
                tone="soft"
              />
              <Skeleton className="h-6 w-3/4 rounded-full" tone="muted" />
              <Skeleton className="h-4 w-1/2 rounded-full" tone="muted" />
              <div className="space-y-4 pt-4">
                <Skeleton className="h-24 rounded-3xl" tone="soft" />
                <Skeleton className="h-24 rounded-3xl" tone="soft" />
              </div>
              <Skeleton className="h-20 rounded-3xl" tone="soft" />
            </div>
          </div>
        </div>
        {hasMetrics ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[#E6EAF6] bg-white px-6 py-5 shadow-[0_25px_60px_-45px_rgba(28,35,51,0.6)]"
              >
                <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
                <Skeleton className="mt-4 h-6 w-16 rounded-full" tone="brand" />
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <Skeleton
        className="h-16 w-full rounded-2xl"
        tone="soft"
        shimmer={false}
      />
    </div>
  )
}

export default HeroSkeleton
