"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Loader2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { getRewardsLeaderboardPage } from "@/actions/public/rewards/actions"
import type { RewardsLeaderboardDisplayEntry } from "@/lib/rewards/display"
import { cn } from "@/lib/utils"
import { userPath } from "@/lib/routes"
import { formatNumber, formatRewards } from "@/lib/rewards/format"

type RankedEntry = RewardsLeaderboardDisplayEntry & { rank: number }

interface RewardsLeaderboardClientProps {
  initialEntries: RewardsLeaderboardDisplayEntry[]
  initialPage: number
  pageSize: number
  initialHasMore: boolean
  initialNextPage: number | null
  total: number
}

function toRankedEntries(
  entries: RewardsLeaderboardDisplayEntry[],
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
      setNextPage(result.nextPage)
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, nextPage, pageSize])

  const endMessage =
    !hasMore && total
      ? `Showing all ${total.toLocaleString()} reward earners.`
      : null

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-6 py-4 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
                Rank
              </th>
              <th className="px-6 py-4 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
                Member
              </th>
              <th className="px-6 py-4 text-center text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
                Launches
              </th>
              <th className="px-6 py-4 text-right text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
                Lifetime earned
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {entries.map((entry) => (
              <RewardLeaderRow
                key={entry.userId}
                entry={entry}
                rank={entry.rank}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-5">
        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoading || !nextPage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0051d5] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading members
                </>
              ) : (
                <>
                  Load more members
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        ) : endMessage ? (
          <p className="text-center text-[13px] leading-5 text-[#43474c]">
            {endMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function getMemberLabel(entry: RewardsLeaderboardDisplayEntry, rank: number) {
  if (rank === 1) return "Top Contributor"
  if (rank <= 3) return "Rewards Leader"
  if (entry.longestStreakCount >= 5) return "Streak Builder"
  if (entry.launchCount > 0) return "Launch Builder"
  return "Community Member"
}

function RewardLeaderRow({
  entry,
  rank,
}: {
  entry: RewardsLeaderboardDisplayEntry
  rank: number
}) {
  const memberLabel = getMemberLabel(entry, rank)
  const isTopRank = rank === 1
  const rankClassName = isTopRank
    ? "bg-[#F97316]/10 text-[#F97316]"
    : rank <= 3
      ? "bg-[#0051d5]/10 text-[#0051d5]"
      : "bg-[#dce9ff] text-[#43474c]"

  return (
    <tr className="group transition-all duration-200 hover:bg-[#f8faff]">
      <td className="px-6 py-4 align-middle">
        <span
          className={cn(
            "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[12px] font-bold leading-4",
            rankClassName,
          )}
        >
          #{rank}
        </span>
      </td>
      <td className="px-6 py-4 align-middle">
        <Link
          href={userPath(entry.userId)}
          className="flex min-w-0 items-center gap-3 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[#0051d5]/30"
        >
          <Avatar className="h-10 w-10 bg-[#dce9ff] text-[13px] font-semibold text-black">
            {entry.avatarUrl ? (
              <AvatarImage
                src={entry.avatarUrl}
                alt={entry.displayName}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback>{entry.initials}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-bold leading-5 text-black underline-offset-4 group-hover:underline">
              {entry.displayName}
            </span>
            <span className="block truncate text-[11px] font-medium leading-[14px] text-[#74777d]">
              {memberLabel}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-6 py-4 text-center align-middle text-[14px] leading-5 text-black">
        {formatNumber(entry.launchCount)}
      </td>
      <td className="px-6 py-4 text-right align-middle text-[14px] font-bold leading-5 text-black">
        {formatRewards(entry.lifetimeEarned)}
      </td>
    </tr>
  )
}
