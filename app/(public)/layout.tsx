import PublicHeader from "@/components/layout/headers/public-header"
import { Suspense } from "react"
import { navigation } from "next/cache"
import PublicFooter from "@/components/layout/footers/public-footer"
import { getPartnerSpotlightProduct } from "@/actions/public/products/featured"
import { PartnerSpotlight } from "@/components/templates/public/common/PartnerSpotlight"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata()
// Public navigation must not run database or session work just to prefetch.
export const ensureStatic = "prefetch"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      data-public-layout
      className="flex min-h-screen flex-col bg-[#f5f7fb] has-[[data-partner-spotlight]]:pb-16"
    >
      <PublicHeader />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
      <Suspense fallback={null}>
        <PublicPartnerSpotlight />
      </Suspense>
    </div>
  )
}

async function PublicPartnerSpotlight() {
  await navigation()
  const product = await getPartnerSpotlightProduct("public-layout").catch(
    () => null,
  )
  return <PartnerSpotlight product={product} />
}
