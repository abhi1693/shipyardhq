import { Metadata } from "next"
export const dynamic = "force-dynamic"
import Link from "next/link"
import {
  getCategories,
  getUseCasesWithCounts,
} from "@/actions/admin/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"

export const metadata: Metadata = {
  title: "Browse Products",
  description: "Discover tools, startups, and products by use case or category",
}

type StrOrArr = string | string[] | undefined
interface BrowseSearchParams {
  useCase?: StrOrArr
  category?: StrOrArr
  verified?: StrOrArr
  sort?: StrOrArr
  page?: StrOrArr
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: BrowseSearchParams
}) {
  const useCases = await getUseCasesWithCounts()
  const categories = await getCategories({
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  })

  const params = await searchParams
  const pick = (v: StrOrArr) => (Array.isArray(v) ? v[0] : v)
  const useCase = pick(params.useCase)
  const category = pick(params.category)
  const verified = pick(params.verified)
  const sort =
    (pick(params.sort) as "new" | "trending" | "votes" | "az") ?? "new"
  const page = pick(params.page) ?? "1"

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
    const base: BrowseSearchParams = {
      useCase,
      category,
      verified,
      sort,
      page: "1",
    }
    const next = { ...base, ...overrides }
    const uc = Array.isArray(next.useCase) ? next.useCase[0] : next.useCase
    const cat = Array.isArray(next.category) ? next.category[0] : next.category
    const ver = Array.isArray(next.verified) ? next.verified[0] : next.verified
    const srt = Array.isArray(next.sort) ? next.sort[0] : next.sort
    if (uc && uc !== "__all__") params.set("useCase", uc)
    if (cat && cat !== "__all__") params.set("category", cat)
    if (ver === "true") params.set("verified", "true")
    if (srt && srt !== "new") params.set("sort", srt)
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
    <PublicContainer max="7xl">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <PageHeader
          title="Discover the best startups."
          subtitle="Browse through a curated collection of SaaS tools, micro-SaaS solutions, and indie side projects built by hackers and makers."
          underline
          meta={
            <>
              Showing {products.length} result{products.length !== 1 && "s"}
              {" • "}Sort: {sortLabelMap[sort] ?? "Newest"}
            </>
          }
        />
        
        {/* Filter Bar */}
        <div className="mb-4">
          <BrowseFilterBar
            useCases={useCases}
            categories={categories}
            current={{ useCase, category, sort, verified: verified === "true" }}
          />
        </div>

        {/* Product Grid */}
        <div>
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
      </div>
    </PublicContainer>
  )
}
