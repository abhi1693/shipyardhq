import { Suspense } from "react"
import { redirect } from "next/navigation"

import { MonthlyLeaderboardSkeleton } from "@/components/templates/public/leaderboard/monthly/skeleton"
import { MonthlyLeaderboardView } from "@/components/templates/public/leaderboard/monthly/view"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  HOME_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_PATH,
  isMonthKey,
  monthlyLeaderboardArchivePath,
} from "@/lib/routes"

export const revalidate = 120

const PAGE_TITLE = "Monthly Product Winners"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
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

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="leaderboard-monthly"
        webPage={{ path: LEADERBOARD_MONTHLY_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: "Leaderboard", path: LEADERBOARD_PATH },
            { name: PAGE_TITLE, path: LEADERBOARD_MONTHLY_PATH },
          ],
        }}
      />
      <Suspense fallback={<MonthlyLeaderboardSkeleton />}>
        <MonthlyLeaderboardView monthParam={monthParam ?? undefined} />
      </Suspense>
    </>
  )
}
