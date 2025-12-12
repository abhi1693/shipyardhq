import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { BROWSE_PATH } from "@/lib/routes"
import {
  getBrowsePagePayload,
  type BrowseSort,
  type BrowsePageFilters,
} from "@/lib/browse/cache"

type StrOrArr = string | string[] | undefined

interface BrowseSearchParams {
  useCase?: StrOrArr
  category?: StrOrArr
  verified?: StrOrArr
  sort?: StrOrArr
  page?: StrOrArr
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
  const pageRaw = Number.parseInt(resolveSingle(params.page) ?? "1", 10)
  const queryRaw = resolveSingle(params.q)?.trim()

  return {
    useCase:
      useCaseRaw && useCaseRaw !== "__all__" ? useCaseRaw.trim() : undefined,
    category:
      categoryRaw && categoryRaw !== "__all__" ? categoryRaw.trim() : undefined,
    verified: resolveSingle(params.verified) === "true",
    sort: isBrowseSort(sortRaw) ? sortRaw : "new",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
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

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-10"
        mainClassName="gap-12"
        main={
          <>
            <Suspense
              fallback={
                <div className="lg:hidden">
                  <SponsoredProductsSkeleton />
                </div>
              }
            >
              <div className="lg:hidden">
                <SponsoredProductsSection />
              </div>
            </Suspense>

            <div className="flex flex-col gap-8">
              <BrowseFilterBar
                useCases={useCases}
                categories={categories}
                current={{
                  useCase: normalizedFilters.useCase,
                  category: normalizedFilters.category,
                  sort: normalizedFilters.sort,
                  verified: normalizedFilters.verified,
                }}
              />

              <section className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {filterSummary.join(" • ")}
                    </p>
                  </div>
                  {hasActiveFilters ? (
                    <Link
                      href={BROWSE_PATH}
                      className="text-sm font-semibold text-[color:var(--brand-1)] underline-offset-4 hover:underline"
                    >
                      Reset filters
                    </Link>
                  ) : null}
                </div>

                <div>
                  {products.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
                      <EmptyState
                        title="No results in sight"
                        description="Adjust filters or jump into another category to keep your search going."
                        actionLabel="Reset filters"
                        actionHref={BROWSE_PATH}
                      />
                    </div>
                  ) : (
                    <ProductGridClient
                      initialProducts={products}
                      initialHasMore={hasMore}
                      initialPage={normalizedFilters.page + 1}
                      searchParams={{
                        useCase: normalizedFilters.useCase,
                        category: normalizedFilters.category,
                        verified: normalizedFilters.verified,
                        sort: normalizedFilters.sort,
                        q: normalizedFilters.query,
                      }}
                    />
                  )}
                </div>
              </section>
            </div>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>
            <Suspense
              fallback={
                <div className="hidden lg:block">
                  <SponsoredProductsSkeleton />
                </div>
              }
            >
              <div className="hidden lg:block">
                <SponsoredProductsSection />
              </div>
            </Suspense>
          </>
        }
      />
    </main>
  )
}
