import { browseSortLabelMap, type BrowseSort } from "@/lib/browse/cache"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getBrowseProductsApiV1PublicBrowseProductsGet } from "@/lib/generated/fastapi/public-homepage"
import type { BrowseProductsPageResult } from "@/lib/generated/fastapi/schemas"
import {
  getPlatformMeta,
  PLATFORM_SLUGS,
  type PlatformSlug,
} from "@/lib/platforms/config"
import { pluralize } from "@/lib/pluralize"

export type PlatformPageFilters = {
  sort: BrowseSort
  page: number
  verified: boolean
  query?: string
}

type PlatformMeta = NonNullable<ReturnType<typeof getPlatformMeta>>

export type PlatformPagePayload = {
  platform: PlatformMeta
  filters: PlatformPageFilters
  products: BrowseProductsPageResult["items"]
  hasMore: BrowseProductsPageResult["hasMore"]
  total: number
  sortLabel: string
  filterSummary: string[]
  headline: string
  hasActiveFilters: boolean
}

export const getPlatformStaticParams = () =>
  PLATFORM_SLUGS.map((platform) => ({ platform }))

const normalizeFilters = (
  filters: PlatformPageFilters,
): PlatformPageFilters => {
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

export const getPlatformPagePayload = cached(
  async (
    platformSlug: PlatformSlug,
    inputFilters: PlatformPageFilters,
  ): Promise<PlatformPagePayload | null> => {
    const platform = getPlatformMeta(platformSlug)
    if (!platform) return null

    const filters = normalizeFilters(inputFilters)
    const browseResponse = await getBrowseProductsApiV1PublicBrowseProductsGet({
      platform: platform.value,
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
      `Platform: ${platform.label}`,
      `Sorted by ${sortLabel}`,
    ]

    if (filters.verified) {
      filterSummary.push("Verified makers only")
    }

    if (filters.query) {
      filterSummary.push(`Search: “${filters.query}”`)
    }

    const headline = filters.query
      ? `Searching ${platform.label} launches`
      : `${platform.label} products`

    return {
      platform,
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
  "platforms:page",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.products],
    keyParts: ([slug, filters]) => {
      return [
        slug,
        filters.sort,
        String(filters.page),
        filters.verified ? "verified" : "all",
        filters.query ?? "",
      ]
    },
  },
)
