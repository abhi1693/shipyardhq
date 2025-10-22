import { Suspense } from "react"

import { CategoriesPageContent } from "@/components/templates/public/categories/page-content"
import { CategoriesPageSkeleton } from "@/components/templates/public/categories/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Categories",
  description: "Browse Shipyard by category and discover innovative products.",
})

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageSkeleton />}>
      <CategoriesPageContent />
    </Suspense>
  )
}
