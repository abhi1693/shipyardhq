import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getMonthlyTopRankedProducts } from "@/actions/public/leaderboard/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { isMonthKey, monthlyLeaderboardArchivePath } from "@/lib/routes"

import { MonthlyLeaderboardView } from "../monthly/view"

export const revalidate = 120

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
        "Browse the top-ranked products for each month and celebrate the makers leading the fleet.",
    })
  }

  const leaderboard = await getMonthlyTopRankedProducts({ month: monthKey })

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

  const leaderboard = await getMonthlyTopRankedProducts({ month: monthKey })

  if (leaderboard.month !== monthKey) {
    redirect(monthlyLeaderboardArchivePath(leaderboard.month))
  }

  return (
    <MonthlyLeaderboardView
      monthParam={monthKey}
      initialLeaderboard={leaderboard}
    />
  )
}
