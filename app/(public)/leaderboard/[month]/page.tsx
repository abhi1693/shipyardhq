export const dynamic = "force-static"

import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"

import { buildPageMetadata } from "@/lib/metadata"
import { isMonthKey, monthlyLeaderboardArchivePath } from "@/lib/routes"
import { getMonthlyLeaderboardPagePayload } from "@/lib/leaderboard/monthly-cache"
import { getMonthlyLeaderboardMonths } from "@/actions/public/leaderboard/actions"

import { MonthlyLeaderboardView } from "@/components/templates/public/leaderboard/monthly/view"
import { MonthlyLeaderboardSkeleton } from "@/components/templates/public/leaderboard/monthly/skeleton"

export const revalidate = 120

export async function generateStaticParams() {
  const months = await getMonthlyLeaderboardMonths()
  return months.map(({ month }: { month: string }) => ({ month }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const monthKey = resolvedParams.month

  if (!isMonthKey(monthKey)) {
    return buildPageMetadata({
      title: "Monthly Product Winners",
      description:
        "Browse the top-ranked products for each month and celebrate the makers topping the leaderboard.",
    })
  }

  const { leaderboard } = await getMonthlyLeaderboardPagePayload(monthKey)

  const metadata = buildPageMetadata({
    title: `${leaderboard.label} Product Winners`,
    description: `See the Shipyard leaderboard champions for ${leaderboard.label}.`,
  })

  return {
    ...metadata,
    alternates: {
      canonical: monthlyLeaderboardArchivePath(leaderboard.month),
    },
  }
}

export default async function MonthlyLeaderboardArchivePage({
  params,
}: {
  params: Promise<{ month: string }>
}) {
  const { month: monthKey } = await params

  if (!isMonthKey(monthKey)) {
    notFound()
  }

  const payload = await getMonthlyLeaderboardPagePayload(monthKey)
  const { leaderboard, months } = payload

  if (leaderboard.month !== monthKey) {
    redirect(monthlyLeaderboardArchivePath(leaderboard.month))
  }

  return (
    <Suspense fallback={<MonthlyLeaderboardSkeleton />}>
      <MonthlyLeaderboardView
        monthParam={monthKey}
        initialLeaderboard={leaderboard}
        initialMonths={months}
      />
    </Suspense>
  )
}
