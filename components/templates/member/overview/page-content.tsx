import {
  Card,
  CardContent,
} from "@/components/atoms/card"
import { currentUser } from "@clerk/nextjs/server"

import { getMemberTrafficOverview } from "@/actions/member/overview/actions"
import { MemberAnalyticsCharts } from "@/components/templates/member/overview/analytics-charts"

const AGGREGATION_WINDOW_DAYS = 7

type StatDefinition = {
  id: string
  label: string
  value: number
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export async function MemberOverviewPageContent() {
  const [summary, user] = await Promise.all([
    getMemberTrafficOverview(AGGREGATION_WINDOW_DAYS),
    currentUser(),
  ])

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  const emailHandle = primaryEmail ? primaryEmail.split("@")[0] : null
  const displayName =
    user?.firstName ?? user?.username ?? emailHandle ?? "Shipmate"

  const stats: StatDefinition[] = [
    { id: "views", label: "Views", value: summary.totalViews },
    {
      id: "visitors",
      label: "Unique visitors",
      value: summary.uniqueVisitors,
    },
    { id: "clicks", label: "Clicks", value: summary.clicksInRange },
    { id: "upvotes", label: "Upvotes", value: summary.upvotesInRange },
  ]

  const trafficData = summary.viewsOverTime.map((point) => ({
    date: point.date,
    label: point.label,
    views: point.views,
    uniqueVisitors: point.uniqueVisitors,
  }))

  const engagementData = summary.engagementOverTime.map((point) => ({
    date: point.date,
    label: point.label,
    clicks: point.clicks,
    upvotes: point.upvotes,
  }))

  const hasTrafficActivity =
    summary.totalViews > 0 || summary.uniqueVisitors > 0
  const hasEngagementActivity =
    summary.clicksInRange > 0 || summary.upvotesInRange > 0

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Hi {displayName}, Welcome back{" "}
          <span role="img" aria-label="Waving hand">
            👋
          </span>
        </h1>
      </header>

      <AnalyticsStatRow stats={stats} />

      <MemberAnalyticsCharts
        trafficData={trafficData}
        engagementData={engagementData}
        hasTrafficActivity={hasTrafficActivity}
        hasEngagementActivity={hasEngagementActivity}
      />
    </div>
  )
}

function AnalyticsStatRow({ stats }: { stats: StatDefinition[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.id}
          className="border border-slate-200 bg-white/95 shadow-sm"
        >
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-3xl font-semibold text-slate-900">
              {numberFormatter.format(stat.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
