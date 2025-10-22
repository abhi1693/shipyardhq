import { Suspense } from "react"

import {
  PricingPageContent,
  metadata,
} from "@/components/templates/public/pricing/page-content"
import { PricingPageSkeleton } from "@/components/templates/public/pricing/skeleton"

export { metadata }

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageSkeleton />}>
      <PricingPageContent />
    </Suspense>
  )
}
