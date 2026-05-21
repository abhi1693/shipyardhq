import { BarChart2, Users } from "lucide-react"

import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { cn } from "@/lib/utils"
import { TrafficSparkline, type SparklinePoint } from "./TrafficSparkline"
import { RealtimeVisitorsCard } from "./RealtimeVisitorsCard"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function TrafficSidebarStatsSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {[1, 2].map((key) => (
        <div
          key={key}
          className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-muted animate-pulse" />
            <span className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="mt-3 h-8 w-24 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="mt-3 h-12 w-full rounded bg-muted animate-pulse" />
        </div>
      ))}
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-muted animate-pulse" />
          <span className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <span className="h-5 w-10 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-3 w-36 rounded bg-muted animate-pulse" />
    </div>
  )
}

function TrafficCard({
  title,
  value,
  label,
  color,
  icon: Icon,
  points,
}: {
  title: string
  value: number
  label: string
  color: string
  icon: typeof BarChart2
  points: SparklinePoint[]
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4" aria-hidden />
        <span>{title}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground">
        {formatNumber(value)}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-3">
        <TrafficSparkline color={color} points={points} />
      </div>
    </div>
  )
}

export async function TrafficSidebarStats({
  className,
}: {
  className?: string
}) {
  const stats = await getLeaderboardStats()
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  })
  const series =
    stats.trafficSeries?.map(
      (row: { date: string; pageViews: number; visitors: number }) => {
        const date = new Date(row.date)
        return {
          label: formatter.format(date),
          pageViews: row.pageViews,
          visitors: row.visitors,
        }
      },
    ) ?? []
  const viewsPoints =
    series.length > 0
      ? series.map((row: { label: string; pageViews: number }) => ({
          label: row.label,
          value: row.pageViews,
        }))
      : [{ label: "Last 30d", value: stats.pageViews30 ?? 0 }]
  const visitorsPoints =
    series.length > 0
      ? series.map((row: { label: string; visitors: number }) => ({
          label: row.label,
          value: row.visitors,
        }))
      : [{ label: "Last 30d", value: stats.visitors30 ?? 0 }]

  return (
    <div className={cn("space-y-3", className)}>
      <TrafficCard
        title="Monthly page views"
        value={stats.pageViews30 ?? 0}
        label="Last 30 days"
        color="#2563eb"
        icon={BarChart2}
        points={viewsPoints}
      />
      <TrafficCard
        title="Monthly visitors"
        value={stats.visitors30 ?? 0}
        label="Last 30 days"
        color="#10b981"
        icon={Users}
        points={visitorsPoints}
      />
      <RealtimeVisitorsCard initialValue={stats.realtimeVisitors ?? 0} />
      <p className="text-xs text-muted-foreground text-center">
        See{" "}
        <a
          href="/analytics"
          className="font-semibold text-slate-700 underline-offset-4 hover:underline"
        >
          the analytics dashboard
        </a>
      </p>
    </div>
  )
}
