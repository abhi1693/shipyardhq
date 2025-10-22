import { Suspense } from "react"

import {
  RewardsLeaderboardPageContent,
  metadata,
  revalidate,
} from "@/components/templates/public/leaderboard/rewards/page-content"
import { RewardsLeaderboardSkeleton } from "@/components/templates/public/leaderboard/rewards/skeleton"

export { metadata, revalidate }

export default function RewardsLeaderboardPage(
  props: Parameters<typeof RewardsLeaderboardPageContent>[0],
) {
  return (
    <Suspense fallback={<RewardsLeaderboardSkeleton />}>
      <RewardsLeaderboardPageContent {...props} />
    </Suspense>
  )
}
