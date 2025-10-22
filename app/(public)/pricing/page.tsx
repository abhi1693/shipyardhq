import { Suspense } from "react"

import { PricingPageContent } from "@/components/templates/public/pricing/page-content"
import { PricingPageSkeleton } from "@/components/templates/public/pricing/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Pricing",
  description: "Transparent pricing for every stage.",
})

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageSkeleton />}>
      <PricingPageContent />
    </Suspense>
  )
}
