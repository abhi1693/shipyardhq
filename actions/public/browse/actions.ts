import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import type {
  Platform,
  PricingModel,
  ProductType,
} from "@/lib/vendor/prisma/client"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  buildPriorityPlanFilter,
  buildRegularPlanFilter,
  getPriorityPlacementPlanIds,
} from "@/lib/products/priority-plans"

interface GetBrowseProductsOptions {
  useCaseSlug?: string
  categorySlug?: string
  verified?: boolean
  sort?: "new" | "trending" | "votes" | "az"
  page?: number
  pageSize?: number
  query?: string
  platform?: Platform
  pricingModel?: PricingModel
  type?: ProductType
  minPriceCents?: number
  maxPriceCents?: number
  badge?: string
  alternativeSlug?: string
}

type UseCaseCategoryRef = Prisma.UseCaseCategoryGetPayload<{
  select: { categoryId: true }
}>

const buildProductCategoryFilter = (
  categoryIds?: string[],
): Prisma.ProductWhereInput | null => {
  if (!categoryIds?.length) return null

  return {
    OR: [
      { categoryId: { in: categoryIds } },
      { categories: { some: { categoryId: { in: categoryIds } } } },
    ],
  }
}

export async function getBrowseProducts({
  useCaseSlug,
  categorySlug,
  verified,
  sort = "new",
  page = 1,
  pageSize = 20,
  query,
  platform,
  pricingModel,
  type,
  minPriceCents,
  maxPriceCents,
  badge,
  alternativeSlug,
}: GetBrowseProductsOptions) {
  "use cache"
  applyCache(
    [TAGS.products, TAGS.categories, TAGS.planFeature("priorityPlacement")],
    DEFAULT_TTL.medium,
  )

  const skip = (page - 1) * pageSize

  let categoryIds: string[] | undefined

  if (useCaseSlug) {
    const useCase = await prisma.useCase.findUnique({
      where: { slug: useCaseSlug },
      include: {
        categories: { select: { categoryId: true } },
      },
    })

    if (!useCase) return { products: [], hasMore: false }

    categoryIds = useCase.categories.map(
      (uc: UseCaseCategoryRef) => uc.categoryId,
    )

    // If a use case is selected but has no assigned categories,
    // return no results instead of ignoring the filter.
    if (!categoryIds?.length) {
      return { products: [], hasMore: false }
    }
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    })
    if (!category) return { products: [], hasMore: false }
    categoryIds = [category.id]
  }

  // Prepare keyword token variants for array matching
  const q = query?.trim()
  const tokens = q ? q.split(/[\s,]+/).filter(Boolean) : []
  const tokensLower = tokens.map((t) => t.toLowerCase())
  const now = new Date()

  const priceFilter: Prisma.ProductWhereInput | null = (() => {
    const hasMin = typeof minPriceCents === "number"
    const hasMax = typeof maxPriceCents === "number"
    if (!hasMin && !hasMax) return null

    const startingPriceFilter: Prisma.IntNullableFilter = {
      ...(hasMin ? { gte: minPriceCents } : {}),
      ...(hasMax ? { lte: maxPriceCents } : {}),
    }

    if (!hasMin || (minPriceCents ?? 0) <= 0) {
      return {
        OR: [
          { pricingModel: "free" },
          { startingPriceCents: 0 },
          { startingPriceCents: startingPriceFilter },
        ],
      }
    }

    return { startingPriceCents: startingPriceFilter }
  })()

  const verificationFilter: Prisma.ProductVerificationWhereInput = {
    ...(verified ? { isVerified: true } : {}),
  }

  const categoryFilter = buildProductCategoryFilter(categoryIds)

  const andFilters: Prisma.ProductWhereInput[] = [
    ...(priceFilter ? [priceFilter] : []),
    ...(categoryFilter ? [categoryFilter] : []),
  ]

  const productFilters: Prisma.ProductWhereInput = {
    ...(Object.keys(verificationFilter).length
      ? { verification: { is: verificationFilter } }
      : {}),
    ...(platform ? { platforms: { has: platform } } : {}),
    ...(pricingModel ? { pricingModel } : {}),
    ...(type ? { type } : {}),
    ...(badge
      ? {
          ProductBadge: {
            some: {
              badge,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        }
      : {}),
    ...(alternativeSlug
      ? {
          alternatives: {
            some: {
              slug: alternativeSlug,
            },
          },
        }
      : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { tagline: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            {
              category: {
                is: { name: { contains: q, mode: "insensitive" } },
              },
            },
            {
              categories: {
                some: {
                  category: {
                    is: { name: { contains: q, mode: "insensitive" } },
                  },
                },
              },
            },
            // Keyword array matches (best-effort for case)
            ...(tokens.length ? [{ keywords: { hasSome: tokens } }] : []),
            ...(tokensLower.length
              ? [{ keywords: { hasSome: tokensLower } }]
              : []),
            { keywords: { has: q } },
          ],
        }
      : {}),
  }
  const baseWhere = buildPublicDiscoveryProductWhere(productFilters)

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "votes"
      ? { analytics: { upvotes: "desc" } }
      : sort === "trending"
        ? { analytics: { upvotes: "desc" } }
        : sort === "az"
          ? { name: "asc" }
          : { createdAt: "desc" }

  const priorityPlanIds = await getPriorityPlacementPlanIds()

  const priorityWhere: Prisma.ProductWhereInput = {
    AND: [baseWhere, buildPriorityPlanFilter(priorityPlanIds, now)],
  }

  const regularWhere: Prisma.ProductWhereInput = {
    AND: [baseWhere, buildRegularPlanFilter(priorityPlanIds, now)],
  }

  // Compute counts to perform correct merged pagination
  const [totalPriority, totalRegular] = priorityPlanIds.length
    ? await Promise.all([
        prisma.product.count({
          where: priorityWhere,
        }),
        prisma.product.count({
          where: regularWhere,
        }),
      ])
    : [
        0,
        await prisma.product.count({
          where: baseWhere,
        }),
      ]

  // Determine how many priority items fall into this page window
  let prioritySkip = 0
  let priorityTake = 0
  let regularSkip = 0
  let regularTake = 0

  if (skip < totalPriority) {
    // Page starts within priority segment
    prioritySkip = skip
    priorityTake = Math.min(pageSize, totalPriority - prioritySkip)
    regularSkip = 0
    regularTake = Math.max(0, pageSize - priorityTake)
  } else {
    // Page starts after all priority items
    prioritySkip = totalPriority // no fetch needed
    priorityTake = 0
    regularSkip = skip - totalPriority
    regularTake = pageSize
  }

  const [priorityProducts, regularProducts] = await Promise.all([
    priorityTake
      ? prisma.product.findMany({
          where: priorityWhere,
          orderBy,
          skip: prioritySkip,
          take: priorityTake,
          select: productCardSelect,
        })
      : Promise.resolve([] as ProductCardRecord[]),
    regularTake
      ? prisma.product.findMany({
          where: regularWhere,
          orderBy,
          skip: regularSkip,
          take: regularTake,
          select: productCardSelect,
        })
      : Promise.resolve([] as ProductCardRecord[]),
  ])

  const allProducts = [...priorityProducts, ...regularProducts]
  const scoreMap = await getCurrentScoreMap(allProducts.map((p) => p.id))
  const products = allProducts.map((product) =>
    mapProductCardRecordToBase(product, now, {
      scoreByProductId: scoreMap,
      priorityPlanIds,
      placementNow: now,
    }),
  )
  const total = totalPriority + totalRegular
  const hasMore = skip + products.length < total

  return { products, hasMore, total }
}
