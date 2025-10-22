import { Suspense } from "react"

import {
  CategoryDetailPageContent,
  generateMetadata,
} from "@/components/templates/public/categories/detail/page-content"
import { CategoryDetailSkeleton } from "@/components/templates/public/categories/detail/skeleton"

export { generateMetadata }

export default function CategoryPage(props: Parameters<typeof CategoryDetailPageContent>[0]) {
  return (
    <Suspense fallback={<CategoryDetailSkeleton />}>
      <CategoryDetailPageContent {...props} />
    </Suspense>
  )
}
