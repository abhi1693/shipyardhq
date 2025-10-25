import type { Metadata } from "next"

import { AlternativeDetailPageContent } from "@/components/templates/public/alternatives/detail/page-content"
import { getAlternativeDetail } from "@/actions/public/alternatives/actions"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata(
  props: Parameters<typeof AlternativeDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const alternative = await getAlternativeDetail(slug)

  if (!alternative) {
    return {}
  }

  const currentYear = new Date().getFullYear()
  const title = `3 Best ${alternative.name} Alternatives in ${currentYear}`
  const description =
    alternative.description?.trim().length
      ? alternative.description
      : `Explore Shipyard products positioned as the best alternatives to ${alternative.name} in ${currentYear}.`

  return buildPageMetadata({
    title,
    description,
    section: "Alternatives",
  })
}

export default function AlternativeDetailPage(
  props: Parameters<typeof AlternativeDetailPageContent>[0],
) {
  return <AlternativeDetailPageContent {...props} />
}
