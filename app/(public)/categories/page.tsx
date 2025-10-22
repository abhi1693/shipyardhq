import { Suspense } from "react"

import {
  CategoriesPageContent,
  metadata,
} from "@/components/templates/public/categories/page-content"
import { CategoriesPageSkeleton } from "@/components/templates/public/categories/skeleton"

export { metadata }

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageSkeleton />}>
      <CategoriesPageContent />
    </Suspense>
  )
}
