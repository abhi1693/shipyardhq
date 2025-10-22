import { Suspense } from "react"

import {
  ProductUpdatesArchivePageContent,
  generateMetadata,
} from "@/components/templates/public/products/updates/page-content"
import { ProductUpdatesArchiveSkeleton } from "@/components/templates/public/products/updates/skeleton"

export { generateMetadata }

export default function ProductUpdatesArchivePage(
  props: Parameters<typeof ProductUpdatesArchivePageContent>[0],
) {
  return (
    <Suspense fallback={<ProductUpdatesArchiveSkeleton />}>
      <ProductUpdatesArchivePageContent {...props} />
    </Suspense>
  )
}
