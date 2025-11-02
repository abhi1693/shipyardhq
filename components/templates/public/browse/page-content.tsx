import Link from "next/link"

import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { BrowseFeaturedCarousel } from "@/components/organisms/BrowseFeaturedCarousel"
import { ProductUpdatesFeed } from "@/components/molecules/ProductUpdatesFeed"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
  RANK_IN_PUBLIC_PATH,
} from "@/lib/routes"
import {
  getBrowsePagePayload,
  type BrowseSort,
  type BrowsePageFilters,
} from "@/lib/browse/cache"

const browseMetrics = [
  {
    key: "totalProducts" as const,
    label: "Directory listings",
  },
  {
    key: "totalCreators" as const,
    label: "Builders featured",
  },
  {
    key: "totalUpvotes" as const,
    label: "Community upvotes",
  },
  {
    key: "totalInsights" as const,
    label: "Insights generated",
  },
] as const

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
    featured,
    useCases,
    categories,
    stats,
    latestProductUpdates,
    filterSummary,
    hasActiveFilters,
  } = await getBrowsePagePayload(parsedFilters)

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-10"
        mainClassName="gap-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <DirectoryHeader
              stats={stats}
              eyebrow="Directory browse"
              title="Browse the Shipyard launch catalog"
              description="We run the homepage spotlight, curate featured campaigns, and track momentum across editor picks, new arrivals, the live leaderboard, and head-to-head live launch battles."
              primaryAction={{
                label: "Submit your launch",
                href: MEMBER_PRODUCTS_PATH,
              }}
              secondaryAction={{
                label: "Join the live showdown",
                href: RANK_IN_PUBLIC_PATH,
                variant: "outline",
              }}
              metrics={browseMetrics}
            />

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
            <BrowseFeaturedCarousel products={featured} />
            <DirectoryCategoryRail categories={categories} />
            <ProductUpdatesFeed updates={latestProductUpdates} />
          </>
        }
      />
    </main>
  )
}
