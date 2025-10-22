import { Suspense } from "react"

import {
  LeaderboardPageContent,
  LeaderboardPageSkeleton,
} from "@/components/templates/public/leaderboard/page-content"

export { metadata } from "@/components/templates/public/leaderboard/page-content"

export default function LeaderboardPage(props: Parameters<typeof LeaderboardPageContent>[0]) {
  return (
    <Suspense fallback={<LeaderboardPageSkeleton />}>
      <LeaderboardPageContent {...props} />
    </Suspense>
  )
}
