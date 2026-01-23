import { Suspense } from "react"

import {
  MemberProductsPageContent,
  MemberProductsPageSkeleton,
} from "@/components/templates/member/products/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Products",
  description: "Manage your products, chart growth, and track performance.",
})

export default function MemberProductsPage(
  props: Parameters<typeof MemberProductsPageContent>[0],
) {
  return (
    <Suspense fallback={<MemberProductsPageSkeleton />}>
      <MemberProductsPageContent {...props} />
    </Suspense>
  )
}
