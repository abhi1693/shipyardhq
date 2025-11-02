import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import DirectoryHeaderSkeletonSection from "@/components/organisms/directory/DirectoryHeader.skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { RANK_IN_PUBLIC_PATH } from "@/lib/routes"

export async function DirectoryHeaderSection() {
  const stats = await getLeaderboardStats()

  return (
    <DirectoryHeader
      stats={stats}
      secondaryAction={{
        label: "Join the live showdown",
        href: RANK_IN_PUBLIC_PATH,
      }}
    />
  )
}

export function DirectoryHeaderSkeleton() {
  return <DirectoryHeaderSkeletonSection metricCount={0} />
}
