import { Suspense } from "react"

import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"

export function TaxonomyTrafficStatsSidebar() {
  return (
    <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
      <TrafficSidebarStats />
    </Suspense>
  )
}
