"use client"

import {
  TrafficStatsPanel,
  type TrafficSidebarStatsPayload,
} from "@/components/templates/public/common/TrafficStatsPanel"

export type { TrafficSidebarStatsPayload }

export function TrafficSidebarStatsContent({
  stats,
  className,
}: {
  stats: TrafficSidebarStatsPayload
  className?: string
}) {
  return (
    <TrafficStatsPanel
      initialStats={stats}
      className={className}
      showDashboardLink
    />
  )
}
