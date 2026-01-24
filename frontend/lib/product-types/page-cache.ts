import { browseSortLabelMap, type BrowseSort } from "@/lib/browse/cache"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getBrowseProductsApiV1PublicBrowseProductsGet } from "@/lib/generated/fastapi/public-homepage"
import type { BrowseProductsPageResult } from "@/lib/generated/fastapi/schemas"
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
  products: BrowseProductsPageResult["items"]
  hasMore: BrowseProductsPageResult["hasMore"]
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

export const getProductTypePagePayload = cached(
  async (
    productTypeSlug: ProductTypeSlug,
    inputFilters: ProductTypePageFilters,
  ): Promise<ProductTypePagePayload | null> => {
    const productType = getProductTypeMeta(productTypeSlug)
    if (!productType) return null

    const filters = normalizeFilters(inputFilters)
    const browseResponse = await getBrowseProductsApiV1PublicBrowseProductsGet({
      productType: productType.value,
      sort: filters.sort,
      verified: filters.verified,
      page: filters.page,
      q: filters.query,
    })
    const browseResult =
      browseResponse.status === 200
        ? browseResponse.data
        : {
            items: [],
            hasMore: false,
            page: filters.page,
            pageSize: 0,
            total: 0,
          }
    const { items: products, hasMore, total } = browseResult

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
  },
  "product-types:page",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.products],
    keyParts: ([slug, filters]) => [
      slug,
      filters.sort,
      String(filters.page),
      filters.verified ? "verified" : "all",
      filters.query ?? "",
    ],
  },
)
