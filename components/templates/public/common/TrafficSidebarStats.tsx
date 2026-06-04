import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { TrafficSidebarStatsContent } from "./TrafficSidebarStatsContent"
import { TrafficSidebarStatsSkeleton } from "./TrafficSidebarStatsSkeleton"

export { TrafficSidebarStatsSkeleton }

export async function TrafficSidebarStats({
  className,
}: {
  className?: string
}) {
  const stats = await getLeaderboardStats()
  return <TrafficSidebarStatsContent stats={stats} className={className} />
}
