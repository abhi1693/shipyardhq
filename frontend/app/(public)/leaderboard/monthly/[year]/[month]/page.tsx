import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getPeriodicLeaderboardByParams } from "@/lib/leaderboard/periodic"
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
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "month",
    year: Number(year),
    month: Number(month),
  })
  const periodLabel = leaderboard?.periodLabel ?? "Monthly leaderboard"
  return {
    title: `Monthly leaderboard — ${periodLabel}`,
    description: `Top Shipyard products for ${periodLabel}, ranked by points.`,
  }
}

export default async function MonthlyLeaderboardArchivePage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams?: Promise<{ revenue?: string; category?: string }>
}) {
  const { year, month } = await params
  const sp = await searchParams
  const verifiedRevenueOnly = sp?.revenue === "verified"
  const leaderboard = await getPeriodicLeaderboardByParams({
    period: "month",
    year: Number(year),
    month: Number(month),
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
