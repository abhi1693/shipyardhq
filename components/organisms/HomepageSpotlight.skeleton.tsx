import * as React from "react"

import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import { DirectoryProductListSkeleton } from "@/components/organisms/directory/DirectoryProductList.skeleton"

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
      <DirectorySectionHeaderSkeleton descriptionLines={0} />
      <div className="mt-8">
        <DirectoryProductListSkeleton
          count={primaryCount + secondaryCount}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        />
      </div>
    </section>
  )
}

export default HomepageSpotlightSkeleton
