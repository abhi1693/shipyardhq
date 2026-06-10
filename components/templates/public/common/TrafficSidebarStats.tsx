import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { LazyTrafficStatsPanel } from "./LazyTrafficStatsPanel"
import { TrafficSidebarStatsSkeleton } from "./TrafficSidebarStatsSkeleton"

export { TrafficSidebarStatsSkeleton }

export async function TrafficSidebarStats({
  className,
}: {
  className?: string
}) {
  const stats = await getLeaderboardStats()
  return <LazyTrafficStatsPanel initialStats={stats} className={className} />
}
