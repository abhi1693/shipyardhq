import { Suspense } from "react"

import { RewardsLeaderboardPageContent } from "@/components/templates/public/leaderboard/rewards/page-content"
import { RewardsLeaderboardSkeleton } from "@/components/templates/public/leaderboard/rewards/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, LEADERBOARD_REWARDS_PATH } from "@/lib/routes"

export const dynamic = "force-dynamic"
export const revalidate = 120

const PAGE_TITLE = "Rewards Leaderboard"

export const metadata = buildPageMetadata({
  title: `${PAGE_TITLE} — Shipyard`,
  description:
    "See which Shipyard members have earned the most rewards from community activity, engagement streaks, and launch momentum.",
  openGraph: {
    url: LEADERBOARD_REWARDS_PATH,
    type: "website",
  },
  twitter: {
    card: "summary",
  },
})

export default function RewardsLeaderboardPage(
  props: Parameters<typeof RewardsLeaderboardPageContent>[0],
) {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="leaderboard-rewards"
        webPage={{ path: LEADERBOARD_REWARDS_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: LEADERBOARD_REWARDS_PATH },
          ],
        }}
      />
      <Suspense fallback={<RewardsLeaderboardSkeleton />}>
        <RewardsLeaderboardPageContent {...props} />
      </Suspense>
    </>
  )
}
