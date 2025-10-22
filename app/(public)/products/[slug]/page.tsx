import { Suspense } from "react"

import {
  ProductDetailPageContent,
  generateMetadata,
} from "@/components/templates/public/products/detail/page-content"
import { ProductDetailSkeleton } from "@/components/templates/public/products/detail/skeleton"

export { generateMetadata }

export default function ProductDetailPage(
  props: Parameters<typeof ProductDetailPageContent>[0],
) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailPageContent {...props} />
    </Suspense>
  )
}
