import { Suspense } from "react"

import { RewardsPageContent } from "@/components/templates/public/rewards/page-content"
import { RewardsPageSkeleton } from "@/components/templates/public/rewards/skeleton"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, REWARDS_PATH } from "@/lib/routes"

const PAGE_TITLE = "Shipyard Rewards"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  section: "Public",
  description:
    "Earn Shipyard rewards by contributing to the community and redeem them for high-visibility placements, analytics, and launch fuel.",
})

export default function RewardsExplainerPage() {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="rewards"
        webPage={{ path: REWARDS_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: REWARDS_PATH },
          ],
        }}
      />
      <Suspense fallback={<RewardsPageSkeleton />}>
        <RewardsPageContent />
      </Suspense>
    </>
  )
}
