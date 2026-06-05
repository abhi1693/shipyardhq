"use client"

import {
  TrafficStatsPanel,
  type TrafficSidebarStatsPayload,
} from "@/components/templates/public/common/TrafficStatsPanel"

export function HomepageAnalyticsGrid({
  initialStats,
  className,
}: {
  initialStats: TrafficSidebarStatsPayload
  className?: string
}) {
  return <TrafficStatsPanel initialStats={initialStats} className={className} />
}
