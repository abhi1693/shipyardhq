import { Prisma } from "@/lib/vendor/prisma/client"

import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { productCardSelect } from "@/lib/products/selects"
import {
  buildPublicDiscoveryProductWhere,
  buildPublicDiscoverySqlFilter,
} from "@/lib/products/public-discovery"
import {
  buildPriorityPlanFilter,
  buildRegularPlanFilter,
  getPriorityPlacementPlanIds,
} from "@/lib/products/priority-plans"

const useCaseProductSelect = productCardSelect satisfies Prisma.ProductSelect

export type UseCaseProduct = Prisma.ProductGetPayload<{
  select: typeof useCaseProductSelect
}>

export type UseCaseMeta = {
  id: string
  label: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export type UseCaseCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  productCount: number
}

export type UseCaseProductsPage = {
  products: UseCaseProduct[]
  hasMore: boolean
  total: number
}

export type UseCaseCategoriesWithCounts = {
  useCase: UseCaseMeta
  categories: UseCaseCategory[]
  productCount: number
}

export const USE_CASE_PRODUCTS_PAGE_SIZE = 12
const USE_CASE_HIGHLIGHTS_DEFAULT_LIMIT = 6
const USE_CASE_HIGHLIGHTS_MAX_LIMIT = 12

const sanitizeUseCaseHighlightLimit = (limit?: number) => {
  if (typeof limit !== "number") {
    return USE_CASE_HIGHLIGHTS_DEFAULT_LIMIT
  }
  if (!Number.isFinite(limit)) {
    return USE_CASE_HIGHLIGHTS_DEFAULT_LIMIT
  }
  const normalized = Math.trunc(limit)
  if (normalized <= 0) return 0
  return Math.min(normalized, USE_CASE_HIGHLIGHTS_MAX_LIMIT)
}

type UseCaseSummary = {
  id: string
  slug: string
  label: string
  updatedAt: Date
  productCount: number
}

export type UseCaseHighlight = {
  id: string
  slug: string
  label: string
}

const getPublishedProductCountsByUseCase = async () => {
  const counts = await prisma.$queryRaw<
    { useCaseId: string; productCount: number }[]
  >(Prisma.sql`
    SELECT uc."useCaseId" AS "useCaseId",
           COUNT(DISTINCT p."id")::int AS "productCount"
    FROM "Product" p
    JOIN "ProductCategory" pc ON pc."productId" = p."id"
    JOIN "UseCaseCategory" uc ON uc."categoryId" = pc."categoryId"
    WHERE p."status" = ${"published"}
      ${buildPublicDiscoverySqlFilter("p")}
    GROUP BY uc."useCaseId"
  `)

  return new Map(
    counts.map(
      ({
        useCaseId,
        productCount,
      }: {
        useCaseId: string
        productCount: number
      }) => [useCaseId, productCount],
    ),
  )
}

export async function getPublicUseCasesWithCounts(): Promise<UseCaseSummary[]> {
  "use cache"
  applyCache([TAGS.useCases], DEFAULT_TTL.slow)

  const useCases = await prisma.useCase.findMany({
    orderBy: { label: "asc" },
    select: {
      id: true,
      label: true,
      slug: true,
      updatedAt: true,
    },
  })

  if (useCases.length === 0) return []

  const productCountsByUseCase = await getPublishedProductCountsByUseCase()
  const results = useCases.map((useCase) => ({
    id: useCase.id,
    slug: useCase.slug,
    label: useCase.label,
    updatedAt: useCase.updatedAt,
    productCount: productCountsByUseCase.get(useCase.id) ?? 0,
  }))

  return results
}

export async function getUseCaseHighlights(
  limit: number = USE_CASE_HIGHLIGHTS_DEFAULT_LIMIT,
): Promise<UseCaseHighlight[]> {
  "use cache"
  applyCache([TAGS.useCases, TAGS.products, TAGS.categories], DEFAULT_TTL.slow)

  const safeLimit = sanitizeUseCaseHighlightLimit(limit)
  if (safeLimit === 0) {
    return [] satisfies UseCaseHighlight[]
  }

  const rows = await prisma.$queryRaw<UseCaseHighlight[]>(Prisma.sql`
      SELECT uc."id", uc."label", uc."slug"
      FROM "UseCase" uc
      INNER JOIN "UseCaseCategory" ucc ON ucc."useCaseId" = uc."id"
      INNER JOIN "ProductCategory" pc ON pc."categoryId" = ucc."categoryId"
      INNER JOIN "Product" p ON p."id" = pc."productId"
      WHERE p."status" = 'published'
      ${buildPublicDiscoverySqlFilter("p")}
      GROUP BY uc."id", uc."label", uc."slug"
      ORDER BY COUNT(DISTINCT p."id") DESC, uc."label" ASC
      LIMIT ${safeLimit}
    `)

  return rows
}

export async function getPublicUseCaseMeta(slug: string) {
  "use cache"
  applyCache([TAGS.useCases, TAGS.usecase(String(slug))], DEFAULT_TTL.medium)

  const useCase = await prisma.useCase.findUnique({
    where: { slug },
    select: {
      id: true,
      label: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!useCase) return null

  const productCountsByUseCase = await getPublishedProductCountsByUseCase()
  const productCount = productCountsByUseCase.get(useCase.id) ?? 0

  return { ...useCase, productCount }
}

export async function getPublicUseCaseCategoriesWithCounts(
  slug: string,
): Promise<UseCaseCategoriesWithCounts | null> {
  "use cache"
  applyCache(
    [TAGS.useCases, TAGS.usecase(String(slug)), TAGS.categories, TAGS.products],
    DEFAULT_TTL.medium,
  )

  const useCase = await prisma.useCase.findUnique({
    where: { slug },
    select: {
      id: true,
      label: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!useCase) return null

  const grouped = await prisma.$queryRaw<
    { categoryId: string; productCount: number }[]
  >(Prisma.sql`
      SELECT pc."categoryId" AS "categoryId",
             COUNT(DISTINCT p."id")::int AS "productCount"
      FROM "ProductCategory" pc
      INNER JOIN "Product" p ON p."id" = pc."productId"
      INNER JOIN "UseCaseCategory" uc ON uc."categoryId" = pc."categoryId"
      WHERE p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND uc."useCaseId" = ${useCase.id}
      GROUP BY pc."categoryId"
    `)

  if (!grouped.length) {
    return {
      useCase,
      categories: [],
      productCount: 0,
    }
  }

  type GroupEntry = (typeof grouped)[number]
  const categoryIds = grouped.map((entry: GroupEntry) => entry.categoryId)
  const categoriesRaw = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
    },
  })

  const countsByCategoryId = new Map(
    grouped.map((entry: GroupEntry) => [entry.categoryId, entry.productCount]),
  )

  const categories: UseCaseCategory[] = categoriesRaw
    .map((category: (typeof categoriesRaw)[number]) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      productCount: countsByCategoryId.get(category.id) ?? 0,
    }))
    .filter((category: UseCaseCategory) => category.productCount > 0)
    .sort((a: UseCaseCategory, b: UseCaseCategory) => {
      if (b.productCount !== a.productCount) {
        return b.productCount - a.productCount
      }
      return a.name.localeCompare(b.name)
    })

  const productCount = grouped.reduce(
    (sum: number, entry: GroupEntry) => sum + (entry.productCount ?? 0),
    0,
  )

  return { useCase, categories, productCount }
}

type UseCaseProductsPageOptions = {
  slug: string
  page?: number
  pageSize?: number
  sort?: "newest" | "upvotes" | "name"
}

const clampPageSize = (value?: number) =>
  Math.max(1, Math.min(Math.floor(value ?? USE_CASE_PRODUCTS_PAGE_SIZE), 50))

export async function getPublicUseCaseProductsPage(
  options: UseCaseProductsPageOptions,
): Promise<UseCaseProductsPage> {
  "use cache"
  applyCache(
    [
      TAGS.useCases,
      TAGS.usecase(String(options.slug)),
      TAGS.products,
      TAGS.categories,
      TAGS.planFeature("priorityPlacement"),
    ],
    DEFAULT_TTL.medium,
  )

  const page = Math.max(1, Math.floor(options.page ?? 1))
  const pageSize = clampPageSize(options.pageSize)
  const skip = (page - 1) * pageSize

  const useCase = await prisma.useCase.findUnique({
    where: { slug: options.slug },
    select: { id: true },
  })

  if (!useCase) {
    return { products: [], hasMore: false, total: 0 }
  }

  const categoryRefs = await prisma.useCaseCategory.findMany({
    where: { useCaseId: useCase.id },
    select: { categoryId: true },
  })

  const categoryIds = categoryRefs.map(
    (ref: (typeof categoryRefs)[number]) => ref.categoryId,
  )
  if (!categoryIds.length) {
    return { products: [], hasMore: false, total: 0 }
  }

  const baseWhere: Prisma.ProductWhereInput = buildPublicDiscoveryProductWhere({
    OR: [
      { categoryId: { in: categoryIds } },
      { categories: { some: { categoryId: { in: categoryIds } } } },
    ],
  })

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    options.sort === "name"
      ? { name: "asc" }
      : options.sort === "upvotes"
        ? { analytics: { upvotes: "desc" } }
        : { createdAt: "desc" }

  const priorityPlanIds = await getPriorityPlacementPlanIds()

  const priorityWhere: Prisma.ProductWhereInput = {
    AND: [baseWhere, buildPriorityPlanFilter(priorityPlanIds)],
  }

  const regularWhere: Prisma.ProductWhereInput = {
    AND: [baseWhere, buildRegularPlanFilter(priorityPlanIds)],
  }

  const [totalPriority, totalRegular] = priorityPlanIds.length
    ? await Promise.all([
        prisma.product.count({ where: priorityWhere }),
        prisma.product.count({ where: regularWhere }),
      ])
    : [0, await prisma.product.count({ where: baseWhere })]

  let prioritySkip = 0
  let priorityTake = 0
  let regularSkip = 0
  let regularTake = 0

  if (skip < totalPriority) {
    prioritySkip = skip
    priorityTake = Math.min(pageSize, totalPriority - prioritySkip)
    regularSkip = 0
    regularTake = Math.max(0, pageSize - priorityTake)
  } else {
    prioritySkip = totalPriority
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
          select: useCaseProductSelect,
        })
      : Promise.resolve([] as UseCaseProduct[]),
    regularTake
      ? prisma.product.findMany({
          where: regularWhere,
          orderBy,
          skip: regularSkip,
          take: regularTake,
          select: useCaseProductSelect,
        })
      : Promise.resolve([] as UseCaseProduct[]),
  ])

  const products = [...priorityProducts, ...regularProducts]
  const total = totalPriority + totalRegular
  const hasMore = skip + products.length < total

  return { products, hasMore, total }
}
