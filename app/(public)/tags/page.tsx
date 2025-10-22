import { Suspense } from "react"

import {
  TagsIndexPageContent,
  metadata,
  revalidate,
} from "@/components/templates/public/tags/index/page-content"
import { TagsIndexSkeleton } from "@/components/templates/public/tags/index/skeleton"

export { metadata, revalidate }

export default function TagsIndexPage(
  props: Parameters<typeof TagsIndexPageContent>[0],
) {
  return (
    <Suspense fallback={<TagsIndexSkeleton />}>
      <TagsIndexPageContent {...props} />
    </Suspense>
  )
}
