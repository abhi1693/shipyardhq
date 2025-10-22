import { Suspense } from "react"

import { BrowsePageContent } from "@/components/templates/public/browse/page-content"
import { BrowsePageSkeleton } from "@/components/templates/public/browse/skeleton"

export { generateMetadata } from "@/components/templates/public/browse/page-content"

export default function BrowsePage(props: Parameters<typeof BrowsePageContent>[0]) {
  return (
    <Suspense fallback={<BrowsePageSkeleton />}>
      <BrowsePageContent {...props} />
    </Suspense>
  )
}
