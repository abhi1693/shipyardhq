import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { getPublicUseCasesWithCounts } from "@/actions/public/use-cases/actions"
import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata()

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [useCases, stickyBannerProducts] = await Promise.all([
    getPublicUseCasesWithCounts(),
    getStickyBannerProducts(12),
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
      <PublicHeader stickyBannerProducts={stickyBannerProducts} />
      <main className="flex-1 bg-white">{children}</main>
      <PublicFooter useCases={footerUseCases} />
    </div>
  )
}
