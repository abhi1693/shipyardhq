import type { Metadata } from "next"

import { AlternativesPageContent } from "@/components/templates/public/alternatives/page-content"
import { buildPageMetadata } from "@/lib/metadata"

const baseMetadata = buildPageMetadata({
  title: "Browse SaaS Alternatives",
  description: "Explore the best alternatives to popular SaaS tools.",
})

export const metadata: Metadata = {
  ...baseMetadata,
}

export default function AlternativesPage(
  props: Parameters<typeof AlternativesPageContent>[0],
) {
  return <AlternativesPageContent {...props} />
}

