import type { Metadata } from "next"
import { Suspense } from "react"

import { TagDetailPageContent } from "@/components/templates/public/tags/detail/page-content"
import { TagDetailSkeleton } from "@/components/templates/public/tags/detail/skeleton"
import { getKeywordTagBySlug } from "@/actions/public/tags/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { formatTagLabel } from "@/app/(public)/tags/_utils"

export async function generateMetadata(
  props: Parameters<typeof TagDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const summary = await getKeywordTagBySlug(slug)
  if (!summary) return {}

  const label = formatTagLabel(summary.canonical || summary.keyword)
  return buildPageMetadata({
    title: `${label} Tag`,
    description: `Discover Shipyard products tagged with “${label}”. Browse the latest launches and tools connected to this keyword.`,
    section: "Tags",
  })
}

export default function TagDetailPage(
  props: Parameters<typeof TagDetailPageContent>[0],
) {
  return (
    <Suspense fallback={<TagDetailSkeleton />}>
      <TagDetailPageContent {...props} />
    </Suspense>
  )
}
