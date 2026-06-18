import { pluralize } from "@/lib/pluralize"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getProducts } from "@/actions/public/products/featured"
import { getUseCasesWithCounts, getCategories } from "@/actions/catalog/actions"
import type { Prisma } from "@/lib/vendor/prisma/client"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { getPlatformMeta } from "@/lib/platforms/config"
import {
  getPricingModelMeta,
  pricingModelValueFromSlug,
} from "@/lib/pricing/models"
import {
  getProductTypeMeta,
  productTypeValueFromSlug,
} from "@/lib/product-types/models"
import { BADGE_OPTIONS } from "@/lib/constants"

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
  sort: BrowseSort
  page: number
  query?: string
  platform?: string
  pricingModel?: string
  productType?: string
  minPrice?: number
  maxPrice?: number
  badge?: string
  backlinkVerified: boolean
}

type CategoryWithProductCount = {
  id: string
  name: string
  slug: string
  icon: string
  description: string
  createdAt: Date
  updatedAt: Date
  _count: { products: number }
}

type CategoryWithAssignmentCount = Omit<CategoryWithProductCount, "_count"> & {
  _count: { productAssignments: number }
}

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
    productAssignments: {
      some: {
        product: { status: "published" },
      },
    },
  },
  include: {
    _count: {
      select: {
        productAssignments: {
          where: {
            product: { status: "published" },
          },
        },
      },
    },
  },
  orderBy: [{ productAssignments: { _count: "desc" } }, { name: "asc" }],
} satisfies Prisma.CategoryFindManyArgs

const normalizePriceBound = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(500, Math.round(value)))
}

const normalizeFilters = (filters: BrowsePageFilters): BrowsePageFilters => {
  const page =
    Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1
  const query = filters.query?.trim()
  let minPrice = normalizePriceBound(filters.minPrice)
  let maxPrice = normalizePriceBound(filters.maxPrice)
  const pricingModel = getPricingModelMeta(filters.pricingModel)?.slug
  if (
    typeof minPrice === "number" &&
    typeof maxPrice === "number" &&
    minPrice > maxPrice
  ) {
    const previousMin = minPrice
    minPrice = maxPrice
    maxPrice = previousMin
  }
  return {
    useCase: filters.useCase || undefined,
    category: filters.category || undefined,
    sort: filters.sort,
    page,
    query: query && query.length ? query : undefined,
    platform: getPlatformMeta(filters.platform)?.slug,
    pricingModel,
    productType: getProductTypeMeta(filters.productType)?.slug,
    minPrice:
      pricingModel !== "free" && typeof minPrice === "number" && minPrice > 0
        ? minPrice
        : undefined,
    maxPrice:
      pricingModel !== "free" && typeof maxPrice === "number" && maxPrice < 500
        ? maxPrice
        : undefined,
    badge: filters.badge || undefined,
    backlinkVerified: Boolean(filters.backlinkVerified),
  }
}

export const getBrowsePagePayload = async (
  input: BrowsePageFilters,
): Promise<BrowsePagePayload> => {
  const filters = normalizeFilters(input)

  const [browseResult, featured, useCases, categoriesRaw] = await Promise.all([
    getBrowseProducts({
      useCaseSlug: filters.useCase,
      categorySlug: filters.category,
      sort: filters.sort,
      page: filters.page,
      query: filters.query,
      platform: getPlatformMeta(filters.platform)?.value,
      pricingModel: pricingModelValueFromSlug(filters.pricingModel),
      type: productTypeValueFromSlug(filters.productType),
      minPriceCents:
        typeof filters.minPrice === "number"
          ? filters.minPrice * 100
          : undefined,
      maxPriceCents:
        typeof filters.maxPrice === "number"
          ? filters.maxPrice * 100
          : undefined,
      badge: filters.badge,
      backlinkVerified: filters.backlinkVerified,
    }),
    getProducts("featured"),
    getUseCasesWithCounts(),
    getCategories(CATEGORY_QUERY) as Promise<CategoryWithAssignmentCount[]>,
  ])

  const categories: CategoryWithProductCount[] = categoriesRaw.map(
    (category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      _count: {
        products: category._count.productAssignments,
      },
    }),
  )
  const products: ProductCardBase[] = browseResult.products
  const { hasMore } = browseResult

  const interestMap = await getProductInterestSignalsMap({
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
    })),
  })
  const productsWithInterest = products.map((product) => ({
    ...product,
    interest: interestMap.get(product.id) ?? null,
  }))
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
    filters.platform ||
    filters.pricingModel ||
    filters.productType ||
    typeof filters.minPrice === "number" ||
    typeof filters.maxPrice === "number" ||
    filters.badge ||
    filters.backlinkVerified ||
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

  if (filters.backlinkVerified) {
    filterSummary.push("Backlink verified")
  }

  const platformLabel = getPlatformMeta(filters.platform)?.label
  if (platformLabel) {
    filterSummary.push(`Platform: ${platformLabel}`)
  }

  const pricingLabel = getPricingModelMeta(filters.pricingModel)?.label
  if (pricingLabel) {
    filterSummary.push(`Pricing: ${pricingLabel}`)
  }

  const productTypeLabel = getProductTypeMeta(filters.productType)?.label
  if (productTypeLabel) {
    filterSummary.push(`Type: ${productTypeLabel}`)
  }

  if (
    typeof filters.minPrice === "number" ||
    typeof filters.maxPrice === "number"
  ) {
    const min = filters.minPrice ?? 0
    const max = filters.maxPrice
    filterSummary.push(
      typeof max === "number" ? `Price: $${min}–$${max}` : `Price: $${min}+`,
    )
  }

  if (filters.badge) {
    const badgeLabel =
      BADGE_OPTIONS.find((option) => option.value === filters.badge)?.label ??
      filters.badge
    filterSummary.push(`Badge: ${badgeLabel}`)
  }

  const headline = filters.query
    ? `Searching “${filters.query}”`
    : selectedCategoryLabel
      ? `${selectedCategoryLabel} launches`
      : selectedUseCaseLabel
        ? `${selectedUseCaseLabel} playbook`
        : "Every Shipyard launch"

  return {
    filters,
    products: productsWithInterest,
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
