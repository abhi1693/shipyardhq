import { redirect } from "next/navigation"

import { buildPageMetadata } from "@/lib/metadata"
import { isMonthKey, monthlyLeaderboardArchivePath } from "@/lib/routes"

import { MonthlyLeaderboardView } from "./view"

export const revalidate = 120

export const metadata = buildPageMetadata({
  title: "Monthly Product Winners",
  description:
    "Browse the top-ranked products for each month and celebrate the makers topping the leaderboard.",
})

export default async function MonthlyLeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const rawMonth = sp.month
  const monthParam = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth

  if (isMonthKey(monthParam)) {
    redirect(monthlyLeaderboardArchivePath(monthParam))
  }

  return <MonthlyLeaderboardView monthParam={monthParam ?? undefined} />
}
