import * as React from "react"

import { AvatarSkeleton } from "@/components/atoms/avatar.skeleton"
import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface RewardsLeaderboardPreviewSkeletonProps
  extends React.ComponentProps<"section"> {
  count?: number
  highlightTop?: boolean
}

export function RewardsLeaderboardPreviewSkeleton({
  className,
  count = 3,
  highlightTop = true,
  ...props
}: RewardsLeaderboardPreviewSkeletonProps) {
  const entries = Array.from({ length: Math.max(1, count) })

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8",
        className,
      )}
      data-slot="rewards-leaderboard-preview-skeleton"
      {...props}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl space-y-3">
          <BadgeSkeleton
            variant="outline"
            labelWidth="8rem"
            leadingIcon
            className="h-7"
          />
          <HeadingSkeleton lines={2} centered={false} />
          <Skeleton className="h-3 w-11/12 rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton variant="link" size="sm" labelWidth="9rem" />
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {entries.map((_, index) => (
          <LeaderboardCardSkeleton
            key={index}
            highlight={highlightTop && index === 0}
            rank={index + 1}
          />
        ))}
      </ul>
    </section>
  )
}

interface LeaderboardCardSkeletonProps extends React.ComponentProps<"li"> {
  highlight?: boolean
  rank?: number
}

function LeaderboardCardSkeleton({
  className,
  highlight = false,
  rank = 1,
  ...props
}: LeaderboardCardSkeletonProps) {
  return (
    <li
      className={cn(
        "group flex h-full flex-col gap-4 rounded-2xl border border-border/70 bg-white/85 p-5 shadow-sm shadow-black/5 transition-none",
        highlight && "border-[color:var(--brand-1)/0.35]",
        className,
      )}
      data-slot="rewards-leaderboard-card-skeleton"
      {...props}
    >
      <div className="flex items-center gap-4">
        <Skeleton
          className={cn(
            "inline-flex h-9 min-w-14 items-center justify-center rounded-full border border-muted-foreground/30",
            highlight && "h-10 min-w-16",
          )}
          tone="soft"
        >
          <span className="sr-only">Rank {rank}</span>
        </Skeleton>
        <AvatarSkeleton size={highlight ? 48 : 44} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
        </div>
      </div>
      <div className="mt-auto space-y-2">
        <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
        <Skeleton className="h-2 w-32 rounded-full" tone="muted" />
      </div>
    </li>
  )
}

export default RewardsLeaderboardPreviewSkeleton
