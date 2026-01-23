import { Suspense } from "react"

import { Skeleton } from "@/components/atoms/skeleton"

import { Card, CardContent } from "@/components/atoms/card"
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
  const user = await currentUser()

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  const emailHandle = primaryEmail ? primaryEmail.split("@")[0] : null
  const displayName =
    user?.firstName ?? user?.username ?? emailHandle ?? "Shipmate"

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

      <Suspense fallback={<AnalyticsSectionSkeleton />}>
        <MemberOverviewAnalyticsSection />
      </Suspense>
    </div>
  )
}

async function MemberOverviewAnalyticsSection() {
  const summary = await getMemberTrafficOverview(AGGREGATION_WINDOW_DAYS)

  const stats: StatDefinition[] = [
    { id: "views", label: "Views", value: summary.totalViews },
    {
      id: "visitors",
      label: "Unique visitors",
      value: summary.uniqueVisitors,
    },
    { id: "upvotes", label: "Upvotes", value: summary.upvotesInRange },
  ]

  const trafficData = summary.viewsOverTime.map((point) => ({
    date: point.date,
    label: point.label,
    views: point.views,
    uniqueVisitors: point.uniqueVisitors,
  }))

  const hasTrafficActivity =
    summary.totalViews > 0 || summary.uniqueVisitors > 0

  return (
    <>
      <AnalyticsStatRow stats={stats} />

      <MemberAnalyticsCharts
        trafficData={trafficData}
        hasTrafficActivity={hasTrafficActivity}
      />
    </>
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

function AnalyticsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <AnalyticsStatRowSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  )
}

function AnalyticsStatRowSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={`stat-skeleton-${index}`}
          className="border border-slate-200 bg-white/80 shadow-sm"
        >
          <CardContent className="space-y-3 p-5">
            <div className="h-3 w-24 rounded bg-slate-200/80 animate-pulse" />
            <div className="h-9 w-32 rounded bg-slate-200/80 animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function ChartCardSkeleton() {
  return (
    <Card className="border border-slate-200 bg-white">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <div className="h-5 w-28 rounded bg-slate-200/80 animate-pulse" />
          <div className="h-4 w-40 rounded bg-slate-200/80 animate-pulse" />
        </div>
        <div className="h-[240px] rounded-lg bg-slate-100 animate-pulse" />
      </CardContent>
    </Card>
  )
}

export function MemberOverviewPageSkeleton() {
  return (
    <div
      className="space-y-8"
      data-slot="member-overview-skeleton"
      aria-busy="true"
    >
      <header className="space-y-2">
        <Skeleton className="h-4 w-28 rounded-full" tone="muted" />
        <Skeleton className="h-7 w-72 rounded-full" tone="soft" />
        <Skeleton className="h-4 w-44 rounded-full" tone="muted" />
      </header>
      <AnalyticsSectionSkeleton />
    </div>
  )
}
