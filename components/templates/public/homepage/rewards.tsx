import { getRewardsLeaderboardEntries } from "@/actions/public/rewards/actions"
import { hydrateRewardsLeaderboardEntries } from "@/lib/rewards/display"
import { RewardsLeaderboardPreview } from "@/components/organisms/RewardsLeaderboardPreview"
import { RewardsLeaderboardPreviewSkeleton } from "@/components/organisms/RewardsLeaderboardPreview.skeleton"

export async function RewardsLeaderboardSection() {
  const entries = await getRewardsLeaderboardEntries(3)
  const hydrated = await hydrateRewardsLeaderboardEntries(entries)
  return <RewardsLeaderboardPreview entries={hydrated} />
}

export function RewardsLeaderboardSkeleton() {
  return <RewardsLeaderboardPreviewSkeleton />
}
