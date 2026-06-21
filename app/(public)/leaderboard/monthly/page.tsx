import { redirect } from "next/navigation"
import { Suspense } from "react"

import { getCurrentLeaderboardWindow } from "@/lib/server/leaderboard/v2"
import { parseMonthKey } from "@/lib/server/leaderboard/months"
import {
  currentMonthlyLeaderboardPath,
  monthlyLeaderboardPath,
} from "@/lib/routes"

export default function MonthlyLeaderboardPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={null}>
      <MonthlyLeaderboardRedirect {...props} />
    </Suspense>
  )
}

async function MonthlyLeaderboardRedirect({
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
      redirect(monthlyLeaderboardPath(year, month))
    }
  }

  const { periodStart } = getCurrentLeaderboardWindow()

  // Redirect to the new monthly path; keep old month key redirect for compatibility.
  redirect(currentMonthlyLeaderboardPath(periodStart))
  return null
}
