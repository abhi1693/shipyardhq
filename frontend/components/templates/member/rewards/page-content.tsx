"use client"

import MemberRewards from "@/components/pages/MemberRewards"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { useGetMemberRewardsSnapshotApiV1MemberRewardsSnapshotGet } from "@/lib/generated/fastapi/member"
import type { MemberRewardsSnapshotPayload } from "@/lib/generated/fastapi/schemas"

const emptySnapshot: MemberRewardsSnapshotPayload = {
  balance: {
    balance: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    lifetimeAdjusted: 0,
    currentStreakCount: 0,
    longestStreakCount: 0,
  },
  transactions: [],
  catalog: [],
  activeEntitlements: [],
  recentRedemptions: [],
  productOptions: [],
}

export function MemberRewardsPageContent() {
  const rewardsQuery =
    useGetMemberRewardsSnapshotApiV1MemberRewardsSnapshotGet<MemberRewardsSnapshotPayload | null>(
      {
        query: {
          select: (response) => (response.status === 200 ? response.data : null),
        },
      },
    )

  if (rewardsQuery.isLoading) {
    return <MemberRewardsPageSkeleton />
  }

  return <MemberRewards snapshot={rewardsQuery.data ?? emptySnapshot} />
}

export function MemberRewardsPageSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={4}
        showFooter
        className="border-slate-200/80 bg-white/95 shadow-sm"
      />

      <div className="space-y-4">
        <CardSkeleton
          tone="soft"
          radius="lg"
          lines={3}
          className="border-slate-200/80 bg-white/95 shadow-sm"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton
              key={index}
              tone="soft"
              radius="lg"
              lines={3}
              showFooter
              className="border-slate-200/70 bg-white"
            />
          ))}
        </div>
        <CardSkeleton
          tone="soft"
          radius="lg"
          lines={4}
          className="border-slate-200/80 bg-white/95 shadow-sm"
        />
      </div>
    </div>
  )
}
