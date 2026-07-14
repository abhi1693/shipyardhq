import { Suspense } from "react"

import { MemberProductsPageContent } from "@/components/templates/member/products/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Products",
  description: "Manage your products, chart growth, and track performance.",
})

export default function MemberProductsPage() {
  return (
    <Suspense fallback={null}>
      <MemberProductsPageContent />
    </Suspense>
  )
}
