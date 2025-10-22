import { Suspense } from "react"

import { LeaderboardGuidePageContent } from "@/components/templates/public/leaderboard/about/page-content"
import { LeaderboardGuideSkeleton } from "@/components/templates/public/leaderboard/about/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "How ShipYardHQ leaderboard scoring works",
  description:
    "Understand how ShipYardHQ ranks products, how scores are calculated, and what each monthly reset means for your launch strategy.",
})

export default function LeaderboardGuidePage() {
  return (
    <Suspense fallback={<LeaderboardGuideSkeleton />}>
      <LeaderboardGuidePageContent />
    </Suspense>
  )
}
