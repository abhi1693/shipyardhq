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
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { year, month } = await params
  const window = await resolvePeriodWindowFromParts({
    period: "month",
    year: Number(year),
    month: Number(month),
  })
  const periodLabel = window?.label ?? "Monthly leaderboard"
  return {
    title: `Monthly leaderboard — ${periodLabel}`,
    description: `Top Shipyard products for ${periodLabel}, ranked by points.`,
  }
}

export default async function MonthlyLeaderboardArchivePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { year, month } = await params
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "month",
    year: Number(year),
    month: Number(month),
  })

  if (!leaderboard) {
    notFound()
  }

  return <PeriodicLeaderboardView leaderboard={leaderboard} />
}
