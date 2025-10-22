import type { Metadata } from "next"
import { Suspense } from "react"

import {
  CategoryDetailPageContent,
} from "@/components/templates/public/categories/detail/page-content"
import { CategoryDetailSkeleton } from "@/components/templates/public/categories/detail/skeleton"
import { getCategoryMeta } from "@/actions/public/categories/actions"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata(
  props: Parameters<typeof CategoryDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const category = await getCategoryMeta(slug)
  if (!category) return {}

  return buildPageMetadata({
    title: category.name,
    section: "Categories",
    description: category.description ?? undefined,
  })
}

export default function CategoryPage(props: Parameters<typeof CategoryDetailPageContent>[0]) {
  return (
    <Suspense fallback={<CategoryDetailSkeleton />}>
      <CategoryDetailPageContent {...props} />
    </Suspense>
  )
}
