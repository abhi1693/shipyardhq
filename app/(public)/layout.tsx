import { Suspense } from "react"
import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { getPartnerSpotlightProduct } from "@/actions/public/products/featured"
import { PartnerSpotlight } from "@/components/templates/public/common/PartnerSpotlight"
import { buildSectionMetadata } from "@/lib/metadata"
import "./public.css"

export const metadata = buildSectionMetadata()

function getPartnerSpotlightRotationKey(date = new Date()) {
  return date.toISOString().slice(0, 13)
}

async function PartnerSpotlightSlot() {
  const partnerSpotlight = await getPartnerSpotlightProduct(
    getPartnerSpotlightRotationKey(),
  ).catch(() => null)

  return <PartnerSpotlight product={partnerSpotlight} />
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb] pb-16">
      <PublicHeader />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
      <Suspense fallback={null}>
        <PartnerSpotlightSlot />
      </Suspense>
    </div>
  )
}
