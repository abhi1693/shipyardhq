import { getBrowseProducts } from "@/actions/public/browse/actions"
import { browseSortLabelMap, type BrowseSort } from "@/lib/browse/cache"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { PSEO_PRODUCT_SLICE_PAGE_SIZE } from "@/lib/pseo/product-slices"
import { pluralize } from "@/lib/pluralize"
import {
  getPricingModelMeta,
  PRICING_MODEL_SLUGS,
  type PricingModelSlug,
} from "@/lib/pricing/models"

export type PricingModelPageFilters = {
  sort: BrowseSort
  page: number
  verified: boolean
  query?: string
}

export type PricingModelPagePayload = {
  pricingModel: NonNullable<ReturnType<typeof getPricingModelMeta>>
  filters: PricingModelPageFilters
  products: Awaited<ReturnType<typeof getBrowseProducts>>["products"]
  hasMore: Awaited<ReturnType<typeof getBrowseProducts>>["hasMore"]
  total: number
  sortLabel: string
  filterSummary: string[]
  headline: string
  hasActiveFilters: boolean
}

export const getPricingModelStaticParams = () =>
  PRICING_MODEL_SLUGS.map((pricingModel) => ({ pricingModel }))

const normalizeFilters = (
  filters: PricingModelPageFilters,
): PricingModelPageFilters => {
  const page =
    Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1
  const query = filters.query?.trim()
  const sort: BrowseSort =
    filters.sort === "trending" ||
    filters.sort === "votes" ||
    filters.sort === "az"
      ? filters.sort
      : "new"

  return {
    page,
    sort,
    verified: Boolean(filters.verified),
    query: query && query.length ? query : undefined,
  }
}

export async function getPricingModelPagePayload(
  pricingModelSlug: PricingModelSlug,
  inputFilters: PricingModelPageFilters,
): Promise<PricingModelPagePayload | null> {
  "use cache"
  applyCache(["pricing:page", TAGS.products], DEFAULT_TTL.medium)

  const pricingModel = getPricingModelMeta(pricingModelSlug)
  if (!pricingModel) return null

  const filters = normalizeFilters(inputFilters)
  const { products, hasMore, total } = await getBrowseProducts({
    pricingModel: pricingModel.value,
    sort: filters.sort,
    verified: filters.verified,
    page: filters.page,
    pageSize: PSEO_PRODUCT_SLICE_PAGE_SIZE,
    query: filters.query,
  })

  const totalResults =
    typeof total === "number" && Number.isFinite(total) ? total : 0
  const sortLabel =
    browseSortLabelMap[filters.sort] ?? browseSortLabelMap["new"]
  const hasActiveFilters = Boolean(
    filters.verified ||
    (filters.query && filters.query.length > 0) ||
    filters.sort !== "new",
  )

  const resultCount =
    totalResults > 0 ? totalResults : Math.max(products.length, 0)

  const filterSummary: string[] = [
    `Showing ${resultCount} ${pluralize(resultCount, "result")}`,
    `Pricing: ${pricingModel.label}`,
    `Sorted by ${sortLabel}`,
  ]

  if (filters.verified) {
    filterSummary.push("Verified makers only")
  }

  if (filters.query) {
    filterSummary.push(`Search: “${filters.query}”`)
  }

  const headline = filters.query
    ? `Searching ${pricingModel.label} launches`
    : `${pricingModel.label} pricing products`

  return {
    pricingModel,
    filters,
    products,
    hasMore,
    total: resultCount,
    sortLabel,
    filterSummary,
    headline,
    hasActiveFilters,
  }
}
