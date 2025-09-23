import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import FeaturedTicker from "@/components/molecules/FeaturedTicker"
import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { getPublicUseCasesWithCounts } from "@/actions/public/use-cases/actions"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata()

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [tickerItems, useCases] = await Promise.all([
    getStickyBannerProducts(12),
    getPublicUseCasesWithCounts(),
  ])

  const footerUseCases = useCases
    .filter((useCase) => useCase.productCount > 0)
    .sort((a, b) => {
      if (b.productCount !== a.productCount) {
        return b.productCount - a.productCount
      }
      return a.label.localeCompare(b.label)
    })
    .slice(0, 6)
    .map((useCase) => ({ label: useCase.label, slug: useCase.slug }))
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      {tickerItems.length > 0 && <FeaturedTicker items={tickerItems} />}
      <main className="flex-1">{children}</main>
      <PublicFooter useCases={footerUseCases} />
    </div>
  )
}
