import { notFound, redirect } from "next/navigation"

import { parseMonthKey } from "@/lib/server/monthlyLeaderboard"

export default async function MonthlyLeaderboardArchivePage({
  params,
}: {
  params: Promise<{ month: string }>
}) {
  const { month: monthKey } = await params

  const parsed = parseMonthKey(monthKey)
  if (!parsed) {
    notFound()
  }

  const month = parsed.getUTCMonth() + 1
  const year = parsed.getUTCFullYear()
  redirect(`/leaderboard/monthly/${year}/${month}`)
}
