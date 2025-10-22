export const revalidate = 3600

import { Suspense } from "react"

import { buildPageMetadata } from "@/lib/metadata"
import {
  TrendsPageContent,
  TrendsPageSkeleton,
} from "@/components/templates/public/trends/page-content"

export const metadata = buildPageMetadata({
  title: "Trend Radar",
  description:
    "Understand which Shipyard categories are heating up. Updated hourly, refreshed weekly, and easy to embed in your own reports.",
})

export default function TrendsPage() {
  return (
    <Suspense fallback={<TrendsPageSkeleton />}>
      <TrendsPageContent />
    </Suspense>
  )
}
