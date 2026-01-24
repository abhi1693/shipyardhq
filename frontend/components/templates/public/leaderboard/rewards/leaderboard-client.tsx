"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { getRewardsLeaderboardPage } from "@/lib/rewards/public-api"
import type { RewardsLeaderboardEntry } from "@/lib/generated/fastapi/schemas"
import { cn } from "@/lib/utils"
import { userPath } from "@/lib/routes"
import {
  formatLaunches,
  formatRelativeRewardsTime,
  formatRewards,
} from "@/lib/rewards/format"

type RankedEntry = RewardsLeaderboardEntry & { rank: number }

interface RewardsLeaderboardClientProps {
  initialEntries: RewardsLeaderboardEntry[]
  initialPage: number
  pageSize: number
  initialHasMore: boolean
  initialNextPage: number | null
  total: number
}

function toRankedEntries(
  entries: RewardsLeaderboardEntry[],
  startRank: number,
): RankedEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: startRank + index,
  }))
}

export function RewardsLeaderboardClient({
  initialEntries,
  initialPage,
  pageSize,
  initialHasMore,
  initialNextPage,
  total,
}: RewardsLeaderboardClientProps) {
  const initialRankStart = (initialPage - 1) * pageSize + 1
  const [entries, setEntries] = useState<RankedEntry[]>(
    toRankedEntries(initialEntries, initialRankStart),
  )
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        pageSize,
        initialPage,
        initialHasMore,
        initialNextPage,
        total,
        initialEntries.map((entry) => entry.userId).join("|"),
      ].join(":"),
    [
      initialEntries,
      initialHasMore,
      initialNextPage,
      initialPage,
      pageSize,
      total,
    ],
  )

  useEffect(() => {
    setEntries(toRankedEntries(initialEntries, initialRankStart))
    setHasMore(initialHasMore)
    setNextPage(initialNextPage)
  }, [
    initialEntries,
    initialHasMore,
    initialNextPage,
    initialRankStart,
    resetKey,
  ])

  const loadMore = useCallback(async () => {
    if (!nextPage || isLoading) return
    setIsLoading(true)
    try {
      const result = await getRewardsLeaderboardPage({
        page: nextPage,
        pageSize,
      })
      const rankStart = (result.page - 1) * pageSize + 1
      const ranked = toRankedEntries(result.items, rankStart)

      setEntries((prev) => {
        const existingIds = new Set(prev.map((item) => item.userId))
        const merged = [...prev]
        ranked.forEach((item) => {
          if (!existingIds.has(item.userId)) {
            merged.push(item)
            existingIds.add(item.userId)
          }
        })
        return merged
      })

      setHasMore(result.hasMore)
      setNextPage(result.nextPage ?? null)
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, nextPage, pageSize])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) {
          loadMore()
        }
      },
      { rootMargin: "0px 0px 320px 0px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadMore, resetKey])

  const endMessage =
    !hasMore && total
      ? `Showing all ${total.toLocaleString()} reward earners.`
      : null

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <RewardLeaderRow key={entry.userId} entry={entry} rank={entry.rank} />
      ))}
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-muted-foreground"
        >
          {isLoading ? "Loading more members…" : "Keep scrolling for more"}
        </div>
      ) : endMessage ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {endMessage}
        </p>
      ) : null}
    </div>
  )
}

function RewardLeaderRow({
  entry,
  rank,
}: {
  entry: RewardsLeaderboardEntry
  rank: number
}) {
  const lastEarnedLabel = formatRelativeRewardsTime(
    entry.lastEarnedAt ? new Date(entry.lastEarnedAt) : null,
  )
  return (
    <Link
      href={userPath(entry.userId)}
      className={cn(
        "group relative flex flex-col gap-5 rounded-3xl border border-border/60 bg-white p-5 shadow-[0_18px_42px_-32px_rgba(7,68,134,0.35)] transition-transform duration-200 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.26]",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.08] px-3 text-sm font-semibold text-[color:var(--brand-1)]">
          #{rank}
        </span>
        <Avatar className="h-12 w-12 bg-muted/60 text-base font-semibold text-foreground shadow-[0_18px_40px_-32px_rgba(7,58,104,0.6)]">
          {entry.avatarUrl ? (
            <AvatarImage
              src={entry.avatarUrl}
              alt={entry.displayName}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback>{entry.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {entry.displayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatLaunches(entry.launchCount)}
          </p>
        </div>
        <div className="ml-auto text-right text-sm text-muted-foreground">
          <p>Balance {formatRewards(entry.balance)}</p>
          {lastEarnedLabel ? <p>Last earned {lastEarnedLabel}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Lifetime rewards
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {formatRewards(entry.lifetimeEarned)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Spent {formatRewards(entry.lifetimeSpent)}</span>
          <span>Refunded {formatRewards(entry.lifetimeRefunded)}</span>
        </div>
      </div>
    </Link>
  )
}
