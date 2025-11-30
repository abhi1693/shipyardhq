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
  month: string
  day: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { year, month, day } = await params
  const window = await resolvePeriodWindowFromParts({
    period: "day",
    year: Number(year),
    month: Number(month),
    day: Number(day),
  })
  const periodLabel = window?.label ?? "Daily leaderboard"
  return {
    title: `Daily leaderboard — ${periodLabel}`,
    description: `Top Shipyard products for ${periodLabel}, ranked by points.`,
  }
}

export default async function DailyLeaderboardPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { year, month, day } = await params
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "day",
    year: Number(year),
    month: Number(month),
    day: Number(day),
  })

  if (!leaderboard) {
    notFound()
  }

  return <PeriodicLeaderboardView leaderboard={leaderboard} />
}
