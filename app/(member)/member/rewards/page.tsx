import { Suspense } from "react"

import {
  MemberRewardsPageContent,
  MemberRewardsPageSkeleton,
} from "@/components/templates/member/rewards/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Rewards",
  description:
    "Track your Shipyard rewards economy and redeem perks for your launches.",
})

export default function MemberRewardsPage() {
  return (
    <Suspense fallback={<MemberRewardsPageSkeleton />}>
      <MemberRewardsPageContent />
    </Suspense>
  )
}
