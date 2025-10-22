import { Suspense } from "react"

import { RewardsLeaderboardPageContent } from "@/components/templates/public/leaderboard/rewards/page-content"
import { RewardsLeaderboardSkeleton } from "@/components/templates/public/leaderboard/rewards/skeleton"
import { buildPageMetadata } from "@/lib/metadata"
import { LEADERBOARD_REWARDS_PATH } from "@/lib/routes"

export const revalidate = 120

export const metadata = buildPageMetadata({
  title: "Rewards Leaderboard — Shipyard",
  description:
    "See which Shipyard members have earned the most rewards from community activity, engagement streaks, and launch momentum.",
  openGraph: {
    url: LEADERBOARD_REWARDS_PATH,
    type: "website",
  },
  twitter: {
    card: "summary",
  },
})

export default function RewardsLeaderboardPage(
  props: Parameters<typeof RewardsLeaderboardPageContent>[0],
) {
  return (
    <Suspense fallback={<RewardsLeaderboardSkeleton />}>
      <RewardsLeaderboardPageContent {...props} />
    </Suspense>
  )
}
