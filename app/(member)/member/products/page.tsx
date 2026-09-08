import { auth } from "@clerk/nextjs/server"

import { Suspense } from "react"

import { MemberProductsPageContent } from "@/components/templates/member/products/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Products",
  description: "Manage your products, chart growth, and track performance.",
})

export default async function MemberProductsPage() {
  await auth.protect()

  return (
    <Suspense fallback={null}>
      <MemberProductsPageContent />
    </Suspense>
  )
}
