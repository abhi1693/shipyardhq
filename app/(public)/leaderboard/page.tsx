import { Suspense } from "react"

import {
  LeaderboardPageContent,
  LeaderboardPageSkeleton,
} from "@/components/templates/public/leaderboard/page-content"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, LEADERBOARD_PATH } from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = "Shipyard Leaderboard"

export const revalidate = 60

export const metadata = buildPageMetadata({
  title: `${PAGE_TITLE} — Ranked by real builder interest`,
  description: `See the top product launches on ${BRAND_NAME}, ranked by builder interest, traffic, community support, and launch momentum.`,
  canonical: LEADERBOARD_PATH,
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
