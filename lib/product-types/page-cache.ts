import { getBrowseProducts } from "@/actions/public/browse/actions"
import { browseSortLabelMap, type BrowseSort } from "@/lib/browse/cache"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { PSEO_PRODUCT_SLICE_PAGE_SIZE } from "@/lib/pseo/product-slices"
import { pluralize } from "@/lib/pluralize"
import {
  getProductTypeMeta,
  PRODUCT_TYPE_SLUGS,
  type ProductTypeSlug,
} from "@/lib/product-types/models"

export type ProductTypePageFilters = {
  sort: BrowseSort
  page: number
  verified: boolean
  query?: string
}

export type ProductTypePagePayload = {
  productType: NonNullable<ReturnType<typeof getProductTypeMeta>>
  filters: ProductTypePageFilters
  products: Awaited<ReturnType<typeof getBrowseProducts>>["products"]
  hasMore: Awaited<ReturnType<typeof getBrowseProducts>>["hasMore"]
  total: number
  sortLabel: string
  filterSummary: string[]
  headline: string
  hasActiveFilters: boolean
}

export const getProductTypeStaticParams = () =>
  PRODUCT_TYPE_SLUGS.map((productType) => ({ productType }))

const normalizeFilters = (
  filters: ProductTypePageFilters,
): ProductTypePageFilters => {
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

export async function getProductTypePagePayload(
  productTypeSlug: ProductTypeSlug,
  inputFilters: ProductTypePageFilters,
): Promise<ProductTypePagePayload | null> {
  "use cache"
  applyCache(["product-types:page", TAGS.products], DEFAULT_TTL.medium)

  const productType = getProductTypeMeta(productTypeSlug)
  if (!productType) return null

  const filters = normalizeFilters(inputFilters)
  const { products, hasMore, total } = await getBrowseProducts({
    type: productType.value,
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
    `Type: ${productType.label}`,
    `Sorted by ${sortLabel}`,
  ]

  if (filters.verified) {
    filterSummary.push("Verified makers only")
  }

  if (filters.query) {
    filterSummary.push(`Search: “${filters.query}”`)
  }

  const headline = filters.query
    ? `Searching ${productType.label} launches`
    : `${productType.label} products`

  return {
    productType,
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
