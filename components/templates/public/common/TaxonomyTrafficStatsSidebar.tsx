import { Activity, Users } from "lucide-react"

import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"

const formatter = new Intl.NumberFormat("en-US")

function StaticMetricCard({
  label,
  value,
  windowDays,
  Icon,
}: {
  label: string
  value: number
  windowDays: number
  Icon: typeof Activity
}) {
  return (
    <div className="min-h-[118px] rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[#43474c]">
          {label}
        </span>
        <Icon className="size-4 shrink-0 text-[#43474c]" aria-hidden />
      </div>
      <div className="text-2xl font-bold leading-none text-black">
        {formatter.format(value)}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#166534]">
        Last {windowDays}d
      </div>
    </div>
  )
}

export async function TaxonomyTrafficStatsSidebar() {
  const stats = await getLeaderboardStats()
  const windowDays = Math.max(
    1,
    stats.analyticsWindowDays ?? ANALYTICS_REPORTING_WINDOW_DAYS,
  )

  return (
    <section aria-label="Shipyard traffic" className="@container">
      <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2">
        <StaticMetricCard
          label="Views"
          value={stats.pageViews ?? 0}
          windowDays={windowDays}
          Icon={Activity}
        />
        <StaticMetricCard
          label="Visitors"
          value={stats.visitors ?? 0}
          windowDays={windowDays}
          Icon={Users}
        />
      </div>
    </section>
  )
}
