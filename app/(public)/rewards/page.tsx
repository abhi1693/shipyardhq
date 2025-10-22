import { Suspense } from "react"

import { RewardsPageContent } from "@/components/templates/public/rewards/page-content"
import { RewardsPageSkeleton } from "@/components/templates/public/rewards/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Shipyard Rewards",
  section: "Public",
  description:
    "Earn Shipyard rewards by contributing to the community and redeem them for high-visibility placements, analytics, and launch fuel.",
})

export default function RewardsExplainerPage() {
  return (
    <Suspense fallback={<RewardsPageSkeleton />}>
      <RewardsPageContent />
    </Suspense>
  )
}
