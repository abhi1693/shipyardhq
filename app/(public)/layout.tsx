import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import FeaturedTicker from "@/components/molecules/FeaturedTicker"
import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { getUseCases } from "@/actions/admin/categories/actions"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata()

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [tickerItems, useCases] = await Promise.all([
    getStickyBannerProducts(12),
    getUseCases({
      select: { label: true, slug: true },
      orderBy: { label: "asc" },
      take: 6,
    }),
  ])
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      {tickerItems.length > 0 && <FeaturedTicker items={tickerItems} />}
      <main className="flex-1">{children}</main>
      <PublicFooter useCases={useCases} />
    </div>
  )
}
