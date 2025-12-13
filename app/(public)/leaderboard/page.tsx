import { Suspense } from "react"

import {
  LeaderboardPageContent,
  LeaderboardPageSkeleton,
} from "@/components/templates/public/leaderboard/page-content"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, LEADERBOARD_PATH } from "@/lib/routes"

const PAGE_TITLE = "Shipyard Leaderboard"

export const metadata = buildPageMetadata({
  title: `${PAGE_TITLE} — Ranked by real builder interest`,
  description:
    "See what builders are actually clicking on, ranked by real interest — not launch-day hype.",
})

export default function LeaderboardPage(
  props: Parameters<typeof LeaderboardPageContent>[0],
) {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="leaderboard"
        webPage={{ path: LEADERBOARD_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: LEADERBOARD_PATH },
          ],
        }}
      />
      <Suspense fallback={<LeaderboardPageSkeleton />}>
        <LeaderboardPageContent {...props} />
      </Suspense>
    </>
  )
}
