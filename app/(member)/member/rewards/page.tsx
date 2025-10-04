import MemberRewards from "@/components/pages/MemberRewards"
import { getMemberRewardsSnapshot } from "@/actions/member/points/actions"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Rewards",
  description: "Track your Shipyard rewards economy and redeem perks for your launches.",
})

export default async function MemberRewardsPage() {
  const snapshot = await getMemberRewardsSnapshot()
  return <MemberRewards snapshot={snapshot} />
}
