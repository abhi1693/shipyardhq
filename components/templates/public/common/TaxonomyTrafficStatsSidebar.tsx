import Link from "next/link"
import { Activity, Users, Zap } from "lucide-react"

import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { ANALYTICS_PATH } from "@/lib/routes"

const formatter = new Intl.NumberFormat("en-US")

function StaticMetricCard({
  label,
  value,
  Icon,
}: {
  label: string
  value: number
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
        Last 30d
      </div>
    </div>
  )
}

export async function TaxonomyTrafficStatsSidebar() {
  const stats = await getLeaderboardStats()
  const activeBuilders = Math.max(1, stats.realtimeVisitors ?? 1)

  return (
    <section aria-label="Shipyard traffic" className="@container">
      <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2">
        <StaticMetricCard
          label="Views"
          value={stats.pageViews30 ?? 0}
          Icon={Activity}
        />
        <StaticMetricCard
          label="Visitors"
          value={stats.visitors30 ?? 0}
          Icon={Users}
        />
        <Link
          href={ANALYTICS_PATH}
          className="block w-full rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2 @[20rem]:col-span-2"
          aria-label={`View analytics for ${formatter.format(activeBuilders)} active builders`}
        >
          <div className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-[#00162a] px-4 py-3 shadow-sm transition-colors duration-300 hover:border-white/20">
            <div className="relative flex size-3 items-center justify-center">
              <div className="size-2.5 rounded-full bg-[#00e676]" />
            </div>
            <span className="ml-1 text-[32px] font-bold leading-none text-white">
              {formatter.format(activeBuilders)}
            </span>
            <span className="whitespace-nowrap text-[12px] font-extrabold uppercase leading-none tracking-[0.05em] text-[#00e676]">
              Active Builders
            </span>
            <Zap className="ml-auto size-[18px] text-[#cbd5e1]" aria-hidden />
          </div>
        </Link>
      </div>
    </section>
  )
}
