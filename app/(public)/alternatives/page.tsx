import type { Metadata } from "next"
import { Suspense } from "react"

import { AlternativesPageContent } from "@/components/templates/public/alternatives/page-content"
import { AlternativesPageSkeleton } from "@/components/templates/public/alternatives/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

const baseMetadata = buildPageMetadata({
  title: "Browse SaaS Alternatives",
  description: "Explore the best alternatives to popular SaaS tools.",
})

export const metadata: Metadata = {
  ...baseMetadata,
}

export default function AlternativesPage() {
  return (
    <Suspense fallback={<AlternativesPageSkeleton />}>
      <AlternativesPageContent />
    </Suspense>
  )
}
