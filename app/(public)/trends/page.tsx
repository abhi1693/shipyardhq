export const revalidate = 3600

import { Suspense } from "react"

import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, TRENDS_PATH } from "@/lib/routes"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  TrendsPageContent,
  TrendsPageSkeleton,
} from "@/components/templates/public/trends/page-content"

const PAGE_TITLE = "Trend Radar"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Understand which Shipyard categories are heating up. Updated hourly, refreshed weekly, and easy to embed in your own reports.",
})

export default function TrendsPage() {
  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="trends"
        webPage={{ path: TRENDS_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: TRENDS_PATH },
          ],
        }}
      />
      <Suspense fallback={<TrendsPageSkeleton />}>
        <TrendsPageContent />
      </Suspense>
    </>
  )
}
