import type { Metadata } from "next"

import { AlternativeDetailPageContent } from "@/components/templates/public/alternatives/detail/page-content"
import {
  getAlternativeDetail,
  getAlternativeProductsPage,
} from "@/actions/public/alternatives/actions"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata(
  props: Parameters<typeof AlternativeDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const alternative = await getAlternativeDetail(slug)

  if (!alternative) {
    return {}
  }

  const productsSummary = await getAlternativeProductsPage({
    alternativeId: alternative.id,
    page: 1,
    pageSize: 1,
  })

  const linkedCount = productsSummary.total
  const currentYear = new Date().getFullYear()
  const countPrefix = linkedCount > 0 ? `${linkedCount} ` : ""
  const title = `${countPrefix}Best ${alternative.name} Alternatives in ${currentYear}`
  const description =
    alternative.description?.trim().length
      ? alternative.description
      : linkedCount > 0
        ? `Explore ${linkedCount} Shipyard products positioned as the best alternatives to ${alternative.name} in ${currentYear}.`
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
