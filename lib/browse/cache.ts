import { pluralize } from "@/lib/pluralize"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getProducts } from "@/actions/public/products/featured"
import {
  getUseCasesWithCounts,
  getCategories,
} from "@/actions/admin/categories/actions"
import type { Prisma } from "@/lib/vendor/prisma/client"

export const browseSortLabelMap: Record<BrowseSort, string> = {
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
  const page =
    Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1
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

export const getBrowsePagePayload = async (
  input: BrowsePageFilters,
): Promise<BrowsePagePayload> => {
  const filters = normalizeFilters(input)

  const [
    browseResult,
    featured,
    useCases,
    categoriesRaw,
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
  ])

  const categories = categoriesRaw
  const { products, hasMore } = browseResult
  const sortLabel = browseSortLabelMap[filters.sort] ?? browseSortLabelMap.new

  const selectedUseCaseLabel = filters.useCase
    ? useCases.find(
        (entry: (typeof useCases)[number]) => entry.slug === filters.useCase,
      )?.label
    : undefined

  const selectedCategoryLabel = filters.category
    ? categories.find(
        (entry: (typeof categories)[number]) => entry.slug === filters.category,
      )?.name
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
          : "Every Shipyard launch"

  return {
    filters,
    products,
    hasMore,
    featured,
    useCases,
    categories,
    sortLabel,
    filterSummary,
    headline,
    hasActiveFilters,
    selectedUseCaseLabel,
    selectedCategoryLabel,
  }
}
