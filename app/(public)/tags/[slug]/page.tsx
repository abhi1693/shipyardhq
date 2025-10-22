import { Suspense } from "react"

import {
  TagDetailPageContent,
  generateMetadata,
  revalidate,
} from "@/components/templates/public/tags/detail/page-content"
import { TagDetailSkeleton } from "@/components/templates/public/tags/detail/skeleton"

export { generateMetadata, revalidate }

export default function TagDetailPage(
  props: Parameters<typeof TagDetailPageContent>[0],
) {
  return (
    <Suspense fallback={<TagDetailSkeleton />}>
      <TagDetailPageContent {...props} />
    </Suspense>
  )
}
