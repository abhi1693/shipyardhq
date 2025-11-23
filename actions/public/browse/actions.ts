import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import type {
  Platform,
  PricingModel,
  ProductType,
} from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  mapProductCardRecordToBase,
  PRIORITY_FEATURE_KEY,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"

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
}

type UseCaseCategoryRef = Prisma.UseCaseCategoryGetPayload<{
  select: { categoryId: true }
}>

export const getBrowseProducts = cached(
  async ({
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
  }: GetBrowseProductsOptions) => {
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

    const baseWhere: Prisma.ProductWhereInput = {
      ...(verified ? { verification: { is: { isVerified: true } } } : {}),
      ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
      ...(platform ? { platforms: { has: platform } } : {}),
      ...(pricingModel ? { pricingModel } : {}),
      ...(type ? { type } : {}),
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

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "votes"
        ? { analytics: { upvotes: "desc" } }
        : sort === "trending"
          ? { analytics: { clicks: "desc" } }
          : sort === "az"
            ? { name: "asc" }
            : { createdAt: "desc" }

    // Build where clauses for priority and regular products
    const planExclusionWhere: Prisma.ProductWhereInput = {
      // plan is null OR (plan exists AND it does NOT have the priority assignment enabled)
      OR: [
        { plan: null },
        {
          plan: {
            is: {
              assignments: {
                none: {
                  enabled: true,
                  feature: { is: { key: PRIORITY_FEATURE_KEY } },
                },
              },
            },
          },
        },
      ],
    }

    const priorityWhere: Prisma.ProductWhereInput = {
      ...baseWhere,
      // product has a plan with an enabled assignment whose feature.key === PRIORITY_KEY
      plan: {
        is: {
          assignments: {
            some: {
              enabled: true,
              feature: { is: { key: PRIORITY_FEATURE_KEY } },
            },
          },
        },
      },
    }

    const hasBaseFilters = Object.keys(baseWhere).length > 0

    const regularWhere: Prisma.ProductWhereInput = hasBaseFilters
      ? {
          AND: [baseWhere, planExclusionWhere],
        }
      : planExclusionWhere

    // Compute counts to perform correct merged pagination
    const [totalPriority, totalRegular] = await Promise.all([
      prisma.product.count({
        where: priorityWhere,
      }),
      prisma.product.count({
        where: regularWhere,
      }),
    ])

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

    const now = new Date()
    const allProducts = [...priorityProducts, ...regularProducts]
    const scoreMap = await getCurrentScoreMap(allProducts.map((p) => p.id))
    const products = allProducts.map((product) =>
      mapProductCardRecordToBase(product, now, { scoreByProductId: scoreMap }),
    )
    const total = totalPriority + totalRegular
    const hasMore = skip + products.length < total

    return { products, hasMore, total }
  },
  "browse:products",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [
      TAGS.products,
      TAGS.categories,
      TAGS.planFeature("priorityPlacement"),
    ],
    keyParts: ([options]) => {
      const parts = [
        options.useCaseSlug ?? "",
        options.categorySlug ?? "",
        options.verified ? "verified" : "all",
        options.sort ?? "new",
        `page:${options.page ?? 1}`,
        options.pageSize ? `pageSize:${options.pageSize}` : "",
        options.query ? `q:${options.query}` : "",
        options.platform ?? "",
        options.pricingModel ?? "",
        options.type ?? "",
      ]

      return parts.filter((part) => Boolean(part))
    },
  },
)
