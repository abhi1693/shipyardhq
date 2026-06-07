import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { TrafficStatsPanel } from "./TrafficStatsPanel"
import { TrafficSidebarStatsSkeleton } from "./TrafficSidebarStatsSkeleton"

export { TrafficSidebarStatsSkeleton }

export async function TrafficSidebarStats({
  className,
}: {
  className?: string
}) {
  const stats = await getLeaderboardStats()
  return <TrafficStatsPanel initialStats={stats} className={className} />
}
