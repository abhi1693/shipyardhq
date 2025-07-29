import { Metadata } from "next"
import { getCategories, getUseCases } from "@/actions/admin/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGrid from "@/components/molecules/ProductGrid"
import BrowseFilters from "@/components/molecules/BrowseFilters"

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

  const { useCase, category, verified, sort = "new", page = "1" } = await searchParams

  const { products, hasMore } = await getBrowseProducts({
    useCaseSlug: useCase === "__all__" ? undefined : useCase,
    categorySlug: category === "__all__" ? undefined : category,
    verified: verified === "true",
    sort,
    page: parseInt(page),
  })

  return (
    <div className="min-h-screen w-full px-4 md:px-8 py-10">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Discover the best startups.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Browse through a curated collection of SaaS tools, micro-SaaS
          solutions, and indie side projects built by hackers and makers.
        </p>
      </div>

      {/* Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Product Grid */}
        <div>
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

        {/* Sidebar */}
        <BrowseFilters
          useCases={useCases}
          categories={categories}
          current={{ useCase, category, sort, verified: verified === "true" }}
        />
      </div>
    </div>
  )
}
