import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface GetBrowseProductsOptions {
  useCaseSlug?: string
  categorySlug?: string
  verified?: boolean
  sort?: "new" | "trending" | "votes" | "az"
  page?: number
  pageSize?: number
}

export async function getBrowseProducts({
  useCaseSlug,
  categorySlug,
  verified,
  sort = "new",
  page = 1,
  pageSize = 20,
}: GetBrowseProductsOptions) {
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

    categoryIds = useCase.categories.map((uc) => uc.categoryId)

    // If a use case is selected but has no assigned categories,
    // return no results instead of ignoring the filter.
    if (categoryIds.length === 0) {
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

  const baseWhere: Prisma.ProductWhereInput = {
    ...(verified ? { verification: { is: { isVerified: true } } } : {}),
    ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "votes"
      ? { analytics: { upvotes: "desc" } }
      : sort === "trending"
        ? { analytics: { clicks: "desc" } }
        : sort === "az"
          ? { name: "asc" }
          : { createdAt: "desc" }

  // Priority feature key
  const PRIORITY_KEY = "priorityPlacement"

  // Build where clauses for priority and regular products
  const priorityWhere: Prisma.ProductWhereInput = {
    ...baseWhere,
    // product has a plan with an enabled assignment whose feature.key === PRIORITY_KEY
    plan: {
      is: {
        assignments: {
          some: {
            enabled: true,
            feature: { is: { key: PRIORITY_KEY } },
          },
        },
      },
    },
  }

  const regularWhere: Prisma.ProductWhereInput = {
    ...baseWhere,
    // plan is null OR (plan exists AND it does NOT have the priority assignment enabled)
    OR: [
      { plan: null },
      {
        plan: {
          is: {
            assignments: {
              none: {
                enabled: true,
                feature: { is: { key: PRIORITY_KEY } },
              },
            },
          },
        },
      },
    ],
  }

  // Compute counts to perform correct merged pagination
  const [totalPriority, totalRegular] = await Promise.all([
    prisma.product.count({ where: priorityWhere }),
    prisma.product.count({ where: regularWhere }),
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
          include: {
            category: true,
            user: true,
            verification: true,
            analytics: true,
            ProductBadge: true,
          },
        })
      : Promise.resolve([] as any[]),
    regularTake
      ? prisma.product.findMany({
          where: regularWhere,
          orderBy,
          skip: regularSkip,
          take: regularTake,
          include: {
            category: true,
            user: true,
            verification: true,
            analytics: true,
            ProductBadge: true,
          },
        })
      : Promise.resolve([] as any[]),
  ])

  const products = [...priorityProducts, ...regularProducts]
  const total = totalPriority + totalRegular
  const hasMore = skip + products.length < total

  return { products, hasMore }
}
