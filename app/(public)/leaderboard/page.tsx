import { Suspense } from "react"

import {
  LeaderboardPageContent,
  LeaderboardPageSkeleton,
} from "@/components/templates/public/leaderboard/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Shipyard Leaderboard — Track live launch momentum",
  description:
    "Monitor the Shipyard leaderboard to see which launches are earning the strongest community momentum right now.",
})

export default function LeaderboardPage(
  props: Parameters<typeof LeaderboardPageContent>[0],
) {
  return (
    <Suspense fallback={<LeaderboardPageSkeleton />}>
      <LeaderboardPageContent {...props} />
    </Suspense>
  )
}
