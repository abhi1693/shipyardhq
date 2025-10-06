import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { getPublicUseCasesWithCounts } from "@/actions/public/use-cases/actions"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata()

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const useCases = await getPublicUseCasesWithCounts()

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
      <main className="flex-1">{children}</main>
      <PublicFooter useCases={footerUseCases} />
    </div>
  )
}
