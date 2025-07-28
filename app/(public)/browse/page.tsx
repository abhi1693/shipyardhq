import { Metadata } from "next"
import { getCategories, getUseCases } from "@/actions/admin/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import BrowseFilters from "@/components/molecules/BrowseFilters"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGrid from "@/components/molecules/ProductGrid"

export const metadata: Metadata = {
  title: "Browse Products",
  description: "Discover tools, startups, and products by use case or category",
}

interface BrowseSearchParams {
  useCase?: string
  category?: string
  verified?: string
  sort?: "new" | "trending" | "votes" | "az"
  page?: string
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: BrowseSearchParams
}) {
  const useCases = await getUseCases()
  const categories = await getCategories()

  const allUseCases = [
    { id: "__all__", slug: "__all__", label: "All Use Cases" },
    ...useCases,
  ]

  const allCategories = [
    { id: "__all__", slug: "__all__", name: "All Categories" },
    ...categories,
  ]

  const { useCase, category, verified, sort = "new", page = "1" } = searchParams

  const { products, hasMore } = await getBrowseProducts({
    useCaseSlug: useCase === "__all__" ? undefined : useCase,
    categorySlug: category === "__all__" ? undefined : category,
    verified: verified === "true",
    sort,
    page: parseInt(page),
  })

  return (
    <div className="min-h-screen w-full px-4 md:px-8 py-10">
      <h1 className="text-3xl font-bold mb-6">Browse Products</h1>

      <BrowseFilters
        useCases={allUseCases}
        categories={allCategories}
        current={{
          useCase,
          category,
          verified: verified === "true",
          sort,
        }}
      />

      {products.length === 0 ? (
        <EmptyState
          title="Nothing Found"
          description="Explore our categories or use cases to find products that suit your needs."
          actionLabel="Reset Filters"
          actionHref="/browse"
        />
      ) : (
        <ProductGrid products={products} hasMore={hasMore} />
      )}
    </div>
  )
}
