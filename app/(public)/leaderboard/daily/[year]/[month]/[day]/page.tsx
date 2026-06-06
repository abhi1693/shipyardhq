import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getPeriodicLeaderboardByParams,
  resolvePeriodWindowFromParts,
} from "@/actions/public/leaderboard/actions"
import { PeriodicLeaderboardView } from "@/components/templates/public/leaderboard/periodic/view"
import { dailyLeaderboardPath } from "@/lib/routes"

export const revalidate = 60

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
    alternates: { canonical: dailyLeaderboardPath(year, month, day) },
  }
}

export default async function DailyLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams?: Promise<{ category?: string }>
}) {
  const { year, month, day } = await params
  const sp = await searchParams
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "day",
    year: Number(year),
    month: Number(month),
    day: Number(day),
    limit: 100,
    categorySlug: sp?.category,
  })

  if (!leaderboard) {
    notFound()
  }

  return (
    <PeriodicLeaderboardView
      leaderboard={leaderboard}
      categorySlug={sp?.category}
    />
  )
}
