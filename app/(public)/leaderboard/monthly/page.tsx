import { redirect } from "next/navigation"

import { getCurrentLeaderboardWindow } from "@/lib/server/leaderboard/v2"
import { parseMonthKey, toMonthKey } from "@/lib/server/leaderboard/months"

export default async function MonthlyLeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const rawMonth = sp.month
  const monthParam = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth

  if (monthParam) {
    const parsed = parseMonthKey(monthParam)
    if (parsed) {
      const month = parsed.getUTCMonth() + 1
      const year = parsed.getUTCFullYear()
      redirect(`/leaderboard/monthly/${year}/${month}`)
    }
  }

  const { periodStart } = getCurrentLeaderboardWindow()
  const monthKey = toMonthKey(periodStart)
  const month = periodStart.getUTCMonth() + 1
  const year = periodStart.getUTCFullYear()

  // Redirect to the new monthly path; keep old month key redirect for compatibility.
  redirect(
    `/leaderboard/monthly/${year}/${month}?from=${encodeURIComponent(monthKey)}`,
  )
}
