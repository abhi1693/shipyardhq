import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getPeriodicLeaderboardByParams,
  resolvePeriodWindowFromParts,
} from "@/actions/public/leaderboard/actions"
import { PeriodicLeaderboardView } from "@/components/templates/public/leaderboard/periodic/view"

export const dynamic = "force-dynamic"

type PageParams = {
  year: string
  week: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { year, week } = await params
  const window = await resolvePeriodWindowFromParts({
    period: "week",
    year: Number(year),
    week: Number(week),
  })
  const periodLabel = window?.label ?? "Weekly leaderboard"
  return {
    title: `Weekly leaderboard — ${periodLabel}`,
    description: `Top Shipyard products for ${periodLabel}, ranked by points.`,
  }
}

export default async function WeeklyLeaderboardPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { year, week } = await params
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "week",
    year: Number(year),
    week: Number(week),
  })

  if (!leaderboard) {
    notFound()
  }

  return <PeriodicLeaderboardView leaderboard={leaderboard} />
}
