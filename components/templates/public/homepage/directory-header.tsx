import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import DirectoryHeaderSkeletonSection from "@/components/organisms/directory/DirectoryHeader.skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { LEADERBOARD_PATH } from "@/lib/routes"

export async function DirectoryHeaderSection() {
  const stats = await getLeaderboardStats()

  return (
    <DirectoryHeader
      stats={stats}
      secondaryAction={{
        label: "View the leaderboard",
        href: LEADERBOARD_PATH,
        variant: "outline",
      }}
    />
  )
}

export function DirectoryHeaderSkeleton() {
  return <DirectoryHeaderSkeletonSection metricCount={0} />
}
