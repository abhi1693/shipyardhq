import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { getPartnerSpotlightProduct } from "@/actions/public/products/featured"
import { PartnerSpotlight } from "@/components/templates/public/common/PartnerSpotlight"
import { buildSectionMetadata } from "@/lib/metadata"
import { cn } from "@/lib/utils"

export const metadata = buildSectionMetadata()

function getPartnerSpotlightRotationKey(date = new Date()) {
  return date.toISOString().slice(0, 13)
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const partnerSpotlight = await getPartnerSpotlightProduct(
    getPartnerSpotlightRotationKey(),
  ).catch(() => null)

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[#f5f7fb]",
        partnerSpotlight && "pb-16",
      )}
    >
      <PublicHeader />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
      <PartnerSpotlight product={partnerSpotlight} />
    </div>
  )
}
