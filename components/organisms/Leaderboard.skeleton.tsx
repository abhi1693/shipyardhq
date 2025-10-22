import * as React from "react"

import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import { DirectoryProductListSkeleton } from "@/components/organisms/directory/DirectoryProductList.skeleton"

interface LeaderboardSkeletonProps extends React.ComponentProps<"section"> {
  count?: number
}

export function LeaderboardSkeleton({
  className,
  count = 8,
  ...props
}: LeaderboardSkeletonProps) {
  return (
    <section
      className={
        "rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8" +
        (className ? ` ${className}` : "")
      }
      data-slot="leaderboard-skeleton"
      {...props}
    >
      <DirectorySectionHeaderSkeleton
        descriptionLines={2}
        withAction
      />
      <div className="mt-8">
        <DirectoryProductListSkeleton
          count={count}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          showMetaBadge
        />
      </div>
    </section>
  )
}

export default LeaderboardSkeleton
