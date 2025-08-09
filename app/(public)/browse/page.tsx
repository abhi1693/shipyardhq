import { Metadata } from "next"
import Link from "next/link"
import { getCategories, getUseCases } from "@/actions/admin/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGrid from "@/components/molecules/ProductGrid"
import BrowseFilters from "@/components/molecules/BrowseFilters"
import ProductGridClient from "@/components/molecules/ProductGridClient"

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

  const {
    useCase,
    category,
    verified,
    sort = "new",
    page = "1",
  } = await searchParams

  const { products, hasMore } = await getBrowseProducts({
    useCaseSlug: useCase === "__all__" ? undefined : useCase,
    categorySlug: category === "__all__" ? undefined : category,
    verified: verified === "true",
    sort,
    page: parseInt(page),
  })

  const hasActiveFilters =
    (useCase && useCase !== "__all__") ||
    (category && category !== "__all__") ||
    verified === "true" ||
    (sort && sort !== "new")

  const buildUrl = (overrides: Partial<BrowseSearchParams>) => {
    const params = new URLSearchParams()
    const base: BrowseSearchParams = { useCase, category, verified, sort, page: "1" }
    const next = { ...base, ...overrides }
    if (next.useCase && next.useCase !== "__all__") params.set("useCase", next.useCase)
    if (next.category && next.category !== "__all__") params.set("category", next.category)
    if (next.verified === "true") params.set("verified", "true")
    if (next.sort && next.sort !== "new") params.set("sort", next.sort)
    // always reset page to 1 on changes
    params.set("page", "1")
    const qs = params.toString()
    return qs ? `/browse?${qs}` : "/browse"
  }

  const sortLabelMap: Record<string, string> = {
    new: "Newest",
    trending: "Trending",
    votes: "Most Upvoted",
    az: "A–Z",
  }

  return (
    <div className="min-h-screen w-full px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Discover the best startups.
        </h1>
        <div className="mt-1 h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />
        <p className="text-muted-foreground max-w-2xl">
          Browse through a curated collection of SaaS tools, micro-SaaS
          solutions, and indie side projects built by hackers and makers.
        </p>
        <div className="text-sm text-muted-foreground">
          Showing {products.length} result{products.length !== 1 && "s"}
          {" • "}Sort: {sortLabelMap[sort] ?? "Newest"}
        </div>
      </div>

      {/* Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Product Grid */}
        <div>
          {/* Active filter chips + clear */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {useCase && useCase !== "__all__" && (
                <Link
                  href={buildUrl({ useCase: "__all__" })}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Use Case: {useCases.find((u) => u.slug === useCase)?.label ?? useCase}
                  <span aria-hidden>×</span>
                </Link>
              )}
              {category && category !== "__all__" && (
                <Link
                  href={buildUrl({ category: "__all__" })}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Category: {categories.find((c) => c.slug === category)?.name ?? category}
                  <span aria-hidden>×</span>
                </Link>
              )}
              {verified === "true" && (
                <Link
                  href={buildUrl({ verified: undefined })}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Verified Only
                  <span aria-hidden>×</span>
                </Link>
              )}
              {sort !== "new" && (
                <Link
                  href={buildUrl({ sort: "new" })}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Sort: {sortLabelMap[sort] ?? sort}
                  <span aria-hidden>×</span>
                </Link>
              )}
              <Link
                href="/browse"
                className="ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                Clear all
              </Link>
            </div>
          )}
          {products.length === 0 ? (
            <div>
              <EmptyState
                title="Nothing Found"
                description="Explore our categories or use cases to find products that suit your needs."
                actionLabel="Reset Filters"
                actionHref="/browse"
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/browse?sort=trending"
                  className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
                >
                  Try Trending
                </Link>
                <Link
                  href="/browse?verified=true"
                  className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
                >
                  Verified Only
                </Link>
              </div>
            </div>
          ) : (
            <ProductGridClient
              initialProducts={products}
              initialHasMore={hasMore}
              initialPage={2}
              searchParams={{
                useCase: useCase === "__all__" ? undefined : useCase,
                category: category === "__all__" ? undefined : category,
                verified: verified === "true",
                sort,
              }}
            />
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
