import { Suspense } from "react"

import { TagsIndexPageContent } from "@/components/templates/public/tags/index/page-content"
import { TagsIndexSkeleton } from "@/components/templates/public/tags/index/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

export const revalidate = 300

export const metadata = buildPageMetadata({
  title: "Browse Tags",
  description:
    "Explore Shipyard products by their top keywords and discover new tools aligned with your interests.",
})

export default function TagsIndexPage(
  props: Parameters<typeof TagsIndexPageContent>[0],
) {
  return (
    <Suspense fallback={<TagsIndexSkeleton />}>
      <TagsIndexPageContent {...props} />
    </Suspense>
  )
}
