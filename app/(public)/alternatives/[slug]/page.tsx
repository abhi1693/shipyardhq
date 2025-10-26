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
  const title =
    linkedCount > 0
      ? `Top ${linkedCount} ${alternative.name} Alternatives & Competitors in ${currentYear}`
      : `Best ${alternative.name} Alternatives & Competitors in ${currentYear}`

  const description = alternative.description?.trim().length
    ? alternative.description
    : linkedCount > 0
      ? `Discover the top ${linkedCount} ${alternative.name} competitors, similar tools, and replacement options trusted by Shipyard founders in ${currentYear}.`
      : `Discover the best ${alternative.name} competitors, similar tools, and replacement options trusted by Shipyard founders in ${currentYear}.`

  const keywordPhrases = [
    `best ${alternative.name} alternatives`,
    `${alternative.name} competitors`,
    `top tools like ${alternative.name}`,
    `${alternative.name} replacement software`,
    `${alternative.name} alternative platforms`,
    `${alternative.name} competitor comparison ${currentYear}`,
  ]

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Alternatives",
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  })

  return {
    ...metadata,
    keywords: keywordPhrases,
  }
}

export default function AlternativeDetailPage(
  props: Parameters<typeof AlternativeDetailPageContent>[0],
) {
  return <AlternativeDetailPageContent {...props} />
}
