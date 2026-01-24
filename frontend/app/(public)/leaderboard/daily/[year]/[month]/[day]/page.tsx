import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getPeriodicLeaderboardByParams } from "@/lib/leaderboard/periodic"
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
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "day",
    year: Number(year),
    month: Number(month),
    day: Number(day),
  })
  const periodLabel = leaderboard?.periodLabel ?? "Daily leaderboard"
  return {
    title: `Daily leaderboard — ${periodLabel}`,
    description: `Top Shipyard products for ${periodLabel}, ranked by points.`,
  }
}

export default async function DailyLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams?: Promise<{ revenue?: string; category?: string }>
}) {
  const { year, month, day } = await params
  const sp = await searchParams
  const verifiedRevenueOnly = sp?.revenue === "verified"
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "day",
    year: Number(year),
    month: Number(month),
    day: Number(day),
    verifiedRevenueOnly,
    categorySlug: sp?.category,
  })

  if (!leaderboard) {
    notFound()
  }

  return (
    <PeriodicLeaderboardView
      leaderboard={leaderboard}
      verifiedRevenueOnly={verifiedRevenueOnly}
      categorySlug={sp?.category}
    />
  )
}
