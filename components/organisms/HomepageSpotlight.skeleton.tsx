import * as React from "react"

import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import { DirectoryProductListSkeleton } from "@/components/organisms/directory/DirectoryProductList.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

interface HomepageSpotlightSkeletonProps
  extends React.ComponentProps<"section"> {
  primaryCount?: number
  secondaryCount?: number
}

export function HomepageSpotlightSkeleton({
  className,
  primaryCount = 4,
  secondaryCount = 4,
  ...props
}: HomepageSpotlightSkeletonProps) {
  return (
    <section
      className={
        "rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8" +
        (className ? ` ${className}` : "")
      }
      data-slot="homepage-spotlight-skeleton"
      {...props}
    >
      <DirectorySectionHeaderSkeleton descriptionLines={2} />
      <div className="mt-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-3 w-56 rounded-full" tone="muted" />
          <DirectoryProductListSkeleton
            count={primaryCount}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
          <DirectoryProductListSkeleton
            count={secondaryCount}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          />
        </div>
      </div>
    </section>
  )
}

export default HomepageSpotlightSkeleton
