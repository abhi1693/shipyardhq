import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { pluralize } from "@/lib/pluralize"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getProducts } from "@/actions/public/products/featured"
import {
  getUseCasesWithCounts,
  getCategories,
} from "@/actions/admin/categories/actions"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { getLatestPublicProductUpdates } from "@/actions/public/product-updates/actions"
import type { Prisma } from "@/lib/vendor/prisma/client"

export const browseSortLabelMap: Record<
  BrowseSort,
  string
> = {
  new: "Newest",
  trending: "Trending",
  votes: "Most Upvoted",
  az: "A–Z",
}

export type BrowseSort = "new" | "trending" | "votes" | "az"

export type BrowsePageFilters = {
  useCase?: string
  category?: string
  verified: boolean
  sort: BrowseSort
  page: number
  query?: string
}

type CategoryWithProductCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } }
}>

export type BrowsePagePayload = {
  filters: BrowsePageFilters
  products: Awaited<ReturnType<typeof getBrowseProducts>>["products"]
  hasMore: Awaited<ReturnType<typeof getBrowseProducts>>["hasMore"]
  featured: Awaited<ReturnType<typeof getProducts>>
  useCases: Awaited<ReturnType<typeof getUseCasesWithCounts>>
  categories: CategoryWithProductCount[]
  stats: Awaited<ReturnType<typeof getLeaderboardStats>>
  latestProductUpdates: Awaited<
    ReturnType<typeof getLatestPublicProductUpdates>
  >
  sortLabel: string
  filterSummary: string[]
  headline: string
  hasActiveFilters: boolean
  selectedUseCaseLabel?: string
  selectedCategoryLabel?: string
}

const CATEGORY_QUERY = {
  where: {
    products: {
      some: {},
    },
  },
  include: { _count: { select: { products: true } } },
  orderBy: [{ products: { _count: "desc" } }, { name: "asc" }],
} satisfies Prisma.CategoryFindManyArgs

const normalizeFilters = (filters: BrowsePageFilters): BrowsePageFilters => {
  const page = Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1
  const query = filters.query?.trim()
  return {
    useCase: filters.useCase || undefined,
    category: filters.category || undefined,
    verified: Boolean(filters.verified),
    sort: filters.sort,
    page,
    query: query && query.length ? query : undefined,
  }
}

export const getBrowsePagePayload = cached(
  async (input: BrowsePageFilters): Promise<BrowsePagePayload> => {
    const filters = normalizeFilters(input)

    const [
      browseResult,
      featured,
      useCases,
      categoriesRaw,
      stats,
      latestProductUpdates,
    ] = await Promise.all([
      getBrowseProducts({
        useCaseSlug: filters.useCase,
        categorySlug: filters.category,
        verified: filters.verified,
        sort: filters.sort,
        page: filters.page,
        query: filters.query,
      }),
      getProducts("featured"),
      getUseCasesWithCounts(),
      getCategories(CATEGORY_QUERY) as Promise<CategoryWithProductCount[]>,
      getLeaderboardStats(),
      getLatestPublicProductUpdates(6),
    ])

    const categories = categoriesRaw
    const { products, hasMore } = browseResult
    const sortLabel = browseSortLabelMap[filters.sort] ?? browseSortLabelMap.new

    const selectedUseCaseLabel = filters.useCase
      ? useCases.find((entry) => entry.slug === filters.useCase)?.label
      : undefined

    const selectedCategoryLabel = filters.category
      ? categories.find((entry) => entry.slug === filters.category)?.name
      : undefined

    const hasActiveFilters = Boolean(
      filters.useCase ||
        filters.category ||
        filters.verified ||
        (filters.query && filters.query.length > 0) ||
        filters.sort !== "new",
    )

    const filterSummary: string[] = [
      `Showing ${products.length} ${pluralize(products.length, "result")}`,
      `Sorted by ${sortLabel}`,
    ]

    if (selectedUseCaseLabel) {
      filterSummary.push(`Use case: ${selectedUseCaseLabel}`)
    }

    if (selectedCategoryLabel) {
      filterSummary.push(`Category: ${selectedCategoryLabel}`)
    }

    if (filters.verified) {
      filterSummary.push("Verified makers only")
    }

    const headline = filters.query
      ? `Searching “${filters.query}”`
      : selectedCategoryLabel
        ? `${selectedCategoryLabel} launches`
        : selectedUseCaseLabel
          ? `${selectedUseCaseLabel} playbook`
          : filters.verified
            ? "Verified launches"
            : "Browse every Shipyard launch"

    return {
      filters,
      products,
      hasMore,
      featured,
      useCases,
      categories,
      stats,
      latestProductUpdates,
      sortLabel,
      filterSummary,
      headline,
      hasActiveFilters,
      selectedUseCaseLabel,
      selectedCategoryLabel,
    }
  },
  "browse:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([filters]) => {
      const parts = [
        `useCase:${filters.useCase ?? "all"}`,
        `category:${filters.category ?? "all"}`,
        `verified:${filters.verified ? "true" : "false"}`,
        `sort:${filters.sort}`,
        `page:${filters.page}`,
        filters.query ? `q:${filters.query.toLowerCase()}` : null,
      ].filter((value): value is string => Boolean(value))
      return parts
    },
    tags: () => [
      TAGS.browse,
      TAGS.products,
      TAGS.categories,
      TAGS.leaderboard,
      TAGS.productUpdatesLatest,
      TAGS.useCases,
    ],
  },
)
