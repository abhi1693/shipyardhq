import Link from "next/link"
import { ListFilter } from "lucide-react"

import { EmptyState } from "@/components/molecules/empty-state"
import { BROWSE_PATH } from "@/lib/routes"
import {
  getBrowsePagePayload,
  type BrowseSort,
  type BrowsePageFilters,
} from "@/lib/browse/cache"
import { BrowseHeroSearch } from "@/components/templates/public/browse/BrowseHeroSearch"
import { BrowseRisingStars } from "@/components/templates/public/browse/BrowseRisingStars"
import { BrowseDiscoveryFilters } from "@/components/templates/public/browse/BrowseDiscoveryFilters"
import { BrowseProductRowsClient } from "@/components/templates/public/browse/BrowseProductRowsClient"

type StrOrArr = string | string[] | undefined

interface BrowseSearchParams {
  useCase?: StrOrArr
  category?: StrOrArr
  verified?: StrOrArr
  sort?: StrOrArr
  q?: StrOrArr
}

const resolveSingle = (value: StrOrArr) =>
  Array.isArray(value) ? value[0] : value

const isBrowseSort = (value: string | undefined): value is BrowseSort =>
  value === "new" || value === "trending" || value === "votes" || value === "az"

const parseSearchParams = (params: BrowseSearchParams): BrowsePageFilters => {
  const useCaseRaw = resolveSingle(params.useCase)
  const categoryRaw = resolveSingle(params.category)
  const sortRaw = resolveSingle(params.sort)
  const queryRaw = resolveSingle(params.q)?.trim()

  return {
    useCase:
      useCaseRaw && useCaseRaw !== "__all__" ? useCaseRaw.trim() : undefined,
    category:
      categoryRaw && categoryRaw !== "__all__" ? categoryRaw.trim() : undefined,
    verified: resolveSingle(params.verified) === "true",
    sort: isBrowseSort(sortRaw) ? sortRaw : "new",
    page: 1,
    query: queryRaw && queryRaw.length ? queryRaw : undefined,
  }
}

export async function BrowsePageContent({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>
}) {
  const params = await searchParams
  const parsedFilters = parseSearchParams(params)

  const {
    filters: normalizedFilters,
    products,
    hasMore,
    useCases,
    categories,
    filterSummary,
    hasActiveFilters,
  } = await getBrowsePagePayload(parsedFilters)

  const launchedCount = categories.reduce(
    (total, category) => total + (category._count?.products ?? 0),
    0,
  )

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0b1c30]">
      <BrowseHeroSearch
        query={normalizedFilters.query}
        category={normalizedFilters.category}
        categories={categories}
        useCases={useCases}
        launchedCount={launchedCount}
      />

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-10 px-4 py-12 md:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <BrowseRisingStars products={products} />

          <section>
            <div className="mb-8 flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <ListFilter className="h-5 w-5 text-[#061d31]" aria-hidden />
                  <h2 className="text-2xl font-bold tracking-tight text-[#061d31]">
                    Fresh Finds
                  </h2>
                </div>
                <p className="text-sm text-[#43474c]">
                  {filterSummary.join(" • ")}
                </p>
              </div>
              {hasActiveFilters ? (
                <Link
                  href={BROWSE_PATH}
                  className="text-sm font-bold text-[#0051d5] underline-offset-4 hover:underline"
                >
                  Reset filters
                </Link>
              ) : null}
            </div>

            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#c4c6cd] bg-white p-10 text-center">
                <EmptyState
                  title="No results in sight"
                  description="Adjust filters or jump into another category to keep your search going."
                  actionLabel="Reset filters"
                  actionHref={BROWSE_PATH}
                />
              </div>
            ) : (
              <BrowseProductRowsClient
                initialProducts={products}
                initialHasMore={hasMore}
                initialPage={2}
                searchParams={{
                  useCase: normalizedFilters.useCase,
                  category: normalizedFilters.category,
                  verified: normalizedFilters.verified,
                  sort: normalizedFilters.sort,
                  q: normalizedFilters.query,
                }}
              />
            )}
          </section>
        </div>

        <BrowseDiscoveryFilters
          categories={categories}
          useCases={useCases}
          current={{
            useCase: normalizedFilters.useCase,
            category: normalizedFilters.category,
            sort: normalizedFilters.sort,
            verified: normalizedFilters.verified,
            query: normalizedFilters.query,
          }}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </main>
  )
}
