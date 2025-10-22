import { Suspense } from "react"

import {
  LeaderboardGuidePageContent,
  metadata,
} from "@/components/templates/public/leaderboard/about/page-content"
import { LeaderboardGuideSkeleton } from "@/components/templates/public/leaderboard/about/skeleton"

export { metadata }

export default function LeaderboardGuidePage() {
  return (
    <Suspense fallback={<LeaderboardGuideSkeleton />}>
      <LeaderboardGuidePageContent />
    </Suspense>
  )
}
