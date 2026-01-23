import { Suspense } from "react"

import {
  ClaimProductsPageContent,
  ClaimProductsPageSkeleton,
} from "@/components/templates/member/products/claim-page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Claim products",
  description: "Verify domain ownership and claim unverified listings.",
})

export default function MemberProductsClaimPage(
  props: Parameters<typeof ClaimProductsPageContent>[0],
) {
  return (
    <Suspense fallback={<ClaimProductsPageSkeleton />}>
      <ClaimProductsPageContent {...props} />
    </Suspense>
  )
}
