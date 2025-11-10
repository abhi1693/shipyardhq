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
import { HOME_PATH, LEADERBOARD_GUIDE_PATH, LEADERBOARD_PATH } from "@/lib/routes"

const PAGE_TITLE = "How ShipYardHQ leaderboard scoring works"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Understand how ShipYardHQ ranks products, how scores are calculated, and what each monthly reset means for your launch strategy.",
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
