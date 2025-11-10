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
  title: `${PAGE_TITLE} — Track live launch momentum`,
  description:
    "Monitor the Shipyard leaderboard to see which launches are earning the strongest community momentum right now.",
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
