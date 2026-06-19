import { Suspense } from "react"
import { JsonLdScript } from "next-seo"

import {
  LeaderboardGuidePageContent,
  LEADERBOARD_FAQ,
} from "@/components/templates/public/leaderboard/about/page-content"
import { LeaderboardGuideSkeleton } from "@/components/templates/public/leaderboard/about/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildFaqStructuredData } from "@/lib/seo/faq"
import { buildPageMetadata } from "@/lib/metadata"
import {
  HOME_PATH,
  LEADERBOARD_GUIDE_PATH,
  LEADERBOARD_PATH,
} from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = `Leaderboard Playbook | ${BRAND_NAME}`

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Understand ${BRAND_NAME} leaderboard scoring, ranking cadence, performance signals, and visibility boosts for product launches.`,
})

export default function LeaderboardGuidePage() {
  const faqStructuredData = buildFaqStructuredData(
    LEADERBOARD_FAQ.map((item) => ({ question: item.q, answer: item.a })),
    { pageUrl: LEADERBOARD_GUIDE_PATH },
  )
  const hasFaqStructuredData = faqStructuredData.mainEntity.length > 0

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="leaderboard-guide"
        webPage={{ path: LEADERBOARD_GUIDE_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: "Leaderboard", path: LEADERBOARD_PATH },
            { name: PAGE_TITLE, path: LEADERBOARD_GUIDE_PATH },
          ],
        }}
      />
      {hasFaqStructuredData ? (
        <JsonLdScript
          data={faqStructuredData}
          scriptKey="leaderboard-guide-faq-jsonld"
        />
      ) : null}
      <Suspense fallback={<LeaderboardGuideSkeleton />}>
        <LeaderboardGuidePageContent />
      </Suspense>
    </>
  )
}
