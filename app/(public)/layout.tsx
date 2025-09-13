import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { FaqSection } from "@/components/organisms/FaqSection"
import FeaturedTicker from "@/components/molecules/FeaturedTicker"
import { getStickyBannerProducts } from "@/actions/public/products/featured"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tickerItems = await getStickyBannerProducts(12)
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      {tickerItems.length > 0 && <FeaturedTicker items={tickerItems} />}
      <main className="flex-1">{children}</main>
      <FaqSection />
      <PublicFooter />
    </div>
  )
}
