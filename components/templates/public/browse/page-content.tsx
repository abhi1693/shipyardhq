import Link from "next/link"
import { ListFilter } from "lucide-react"

import { EmptyState } from "@/components/molecules/empty-state"
import { BROWSE_PATH } from "@/lib/routes"
import {
  getBrowsePagePayload,
  type BrowseSort,
  type BrowsePageFilters,
} from "@/lib/browse/cache"
import { getPlatformMeta } from "@/lib/platforms/config"
import { getPricingModelMeta } from "@/lib/pricing/models"
import { getProductTypeMeta } from "@/lib/product-types/models"
import { BADGE_OPTIONS } from "@/lib/constants"
import { BrowseHeroSearch } from "@/components/templates/public/browse/BrowseHeroSearch"
import { BrowseRisingStars } from "@/components/templates/public/browse/BrowseRisingStars"
import { BrowseDiscoveryFilters } from "@/components/templates/public/browse/BrowseDiscoveryFilters"
import { BrowseProductRowsClient } from "@/components/templates/public/browse/BrowseProductRowsClient"

type StrOrArr = string | string[] | undefined

interface BrowseSearchParams {
  useCase?: StrOrArr
  category?: StrOrArr
  sort?: StrOrArr
  q?: StrOrArr
  platform?: StrOrArr
  pricingModel?: StrOrArr
  productType?: StrOrArr
  minPrice?: StrOrArr
  maxPrice?: StrOrArr
  badge?: StrOrArr
  backlinkVerified?: StrOrArr
}

const resolveSingle = (value: StrOrArr) =>
  Array.isArray(value) ? value[0] : value

const isBrowseSort = (value: string | undefined): value is BrowseSort =>
  value === "new" || value === "trending" || value === "votes" || value === "az"

const parsePriceBound = (value: string | undefined) => {
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return Math.max(0, Math.min(500, Math.round(parsed)))
}

const parseSearchParams = (params: BrowseSearchParams): BrowsePageFilters => {
  const useCaseRaw = resolveSingle(params.useCase)
  const categoryRaw = resolveSingle(params.category)
  const sortRaw = resolveSingle(params.sort)
  const queryRaw = resolveSingle(params.q)?.trim()
  const platformRaw = resolveSingle(params.platform)
  const pricingModelRaw = resolveSingle(params.pricingModel)
  const productTypeRaw = resolveSingle(params.productType)
  const badgeRaw = resolveSingle(params.badge)

  return {
    useCase:
      useCaseRaw && useCaseRaw !== "__all__" ? useCaseRaw.trim() : undefined,
    category:
      categoryRaw && categoryRaw !== "__all__" ? categoryRaw.trim() : undefined,
    sort: isBrowseSort(sortRaw) ? sortRaw : "new",
    page: 1,
    query: queryRaw && queryRaw.length ? queryRaw : undefined,
    platform: getPlatformMeta(platformRaw)?.slug,
    pricingModel: getPricingModelMeta(pricingModelRaw)?.slug,
    productType: getProductTypeMeta(productTypeRaw)?.slug,
    minPrice: parsePriceBound(resolveSingle(params.minPrice)),
    maxPrice: parsePriceBound(resolveSingle(params.maxPrice)),
    badge: BADGE_OPTIONS.some((option) => option.value === badgeRaw)
      ? badgeRaw
      : undefined,
    backlinkVerified: resolveSingle(params.backlinkVerified) === "true",
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
              <div className="flex min-h-[640px] items-start justify-center rounded-lg border border-dashed border-[#c4c6cd] bg-white p-10 text-center">
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
                  sort: normalizedFilters.sort,
                  q: normalizedFilters.query,
                  platform: normalizedFilters.platform,
                  pricingModel: normalizedFilters.pricingModel,
                  productType: normalizedFilters.productType,
                  minPrice: normalizedFilters.minPrice,
                  maxPrice: normalizedFilters.maxPrice,
                  badge: normalizedFilters.badge,
                  backlinkVerified: normalizedFilters.backlinkVerified,
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
            query: normalizedFilters.query,
            platform: normalizedFilters.platform,
            pricingModel: normalizedFilters.pricingModel,
            productType: normalizedFilters.productType,
            minPrice: normalizedFilters.minPrice,
            maxPrice: normalizedFilters.maxPrice,
            badge: normalizedFilters.badge,
            backlinkVerified: normalizedFilters.backlinkVerified,
          }}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </main>
  )
}
