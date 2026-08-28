import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { getPartnerSpotlightProduct } from "@/actions/public/products/featured"
import { PartnerSpotlight } from "@/components/templates/public/common/PartnerSpotlight"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata()

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const partnerSpotlight = await getPartnerSpotlightProduct(
    "public-layout",
  ).catch(() => null)

  return (
    <div
      data-public-layout
      className="flex min-h-screen flex-col bg-[#f5f7fb] has-[[data-partner-spotlight]]:pb-16"
    >
      <PublicHeader />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
      <PartnerSpotlight product={partnerSpotlight} />
    </div>
  )
}
