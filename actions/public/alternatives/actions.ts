import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  buildPriorityPlanFilter,
  buildRegularPlanFilter,
  getPriorityPlacementPlanIds,
} from "@/lib/products/priority-plans"

const publicDiscoveryProductWhere = buildPublicDiscoveryProductWhere()

const ALTERNATIVE_CARD_INCLUDE = {
  _count: {
    select: {
      products: { where: publicDiscoveryProductWhere },
    },
  },
} satisfies Prisma.AlternativeProductInclude

const ALTERNATIVE_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  websiteUrl: true,
  logoUrl: true,
} satisfies Prisma.AlternativeProductSelect

export type AlternativeCatalogItem = Prisma.AlternativeProductGetPayload<{
  include: typeof ALTERNATIVE_CARD_INCLUDE
}>

export type AlternativeDetail = Prisma.AlternativeProductGetPayload<{
  select: typeof ALTERNATIVE_DETAIL_SELECT
}>

export type AlternativeDetailProduct = ProductCardBase

export type AlternativeMomentum = {
  id: string
  recentProducts: number
}

export const ALTERNATIVE_DETAIL_PAGE_SIZE = 8

interface GetFeaturedAlternativesOptions {
  excludeId?: string
  take?: number
}

export async function getAlternativeDetail(
  slug: string,
): Promise<AlternativeDetail | null> {
  "use cache"
  applyCache([TAGS.alternativeProducts], DEFAULT_TTL.medium)

  if (!slug?.trim()) {
    return null
  }

  return prisma.alternativeProduct.findUnique({
    where: { slug },
    select: ALTERNATIVE_DETAIL_SELECT,
  })
}

export async function getFeaturedAlternatives({
  excludeId,
  take = 6,
}: GetFeaturedAlternativesOptions = {}): Promise<AlternativeCatalogItem[]> {
  "use cache"
  applyCache([TAGS.alternativeProducts], DEFAULT_TTL.medium)

  const sanitizedTake = Math.min(Math.max(take, 1), 12)

  const records = await prisma.alternativeProduct.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      products: { some: publicDiscoveryProductWhere },
    },
    orderBy: { name: "asc" },
    take: sanitizedTake,
    include: ALTERNATIVE_CARD_INCLUDE,
  })

  return records as AlternativeCatalogItem[]
}

export async function getAlternativesWithCounts(): Promise<
  AlternativeCatalogItem[]
> {
  "use cache"
  applyCache([TAGS.alternativeProducts], DEFAULT_TTL.slow)

  const records = await prisma.alternativeProduct.findMany({
    where: {
      products: { some: publicDiscoveryProductWhere },
    },
    orderBy: { name: "asc" },
    include: ALTERNATIVE_CARD_INCLUDE,
  })

  return records as AlternativeCatalogItem[]
}

export async function getAlternativeMomentumCounts(
  windowStart: Date,
): Promise<AlternativeMomentum[]> {
  "use cache"
  applyCache([TAGS.alternativeProducts, TAGS.products], DEFAULT_TTL.medium)

  const records = await prisma.alternativeProduct.findMany({
    where: {
      products: {
        some: buildPublicDiscoveryProductWhere({
          OR: [
            { publishedAt: { gte: windowStart } },
            {
              publishedAt: null,
              createdAt: { gte: windowStart },
            },
          ],
        }),
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          products: {
            where: buildPublicDiscoveryProductWhere({
              OR: [
                { publishedAt: { gte: windowStart } },
                {
                  publishedAt: null,
                  createdAt: { gte: windowStart },
                },
              ],
            }),
          },
        },
      },
    },
  })

  return records.map((record) => ({
    id: record.id,
    recentProducts: record._count.products,
  }))
}

interface AlternativeProductsPageOptions {
  alternativeId: string
  page?: number
  pageSize?: number
}

export async function getAlternativeProductsPage({
  alternativeId,
  page = 1,
  pageSize = ALTERNATIVE_DETAIL_PAGE_SIZE,
}: AlternativeProductsPageOptions): Promise<{
  items: AlternativeDetailProduct[]
  hasMore: boolean
  nextPage: number | null
  total: number
}> {
  "use cache"
  applyCache([TAGS.alternativeProducts, TAGS.products], DEFAULT_TTL.medium)

  if (!alternativeId) {
    return {
      items: [],
      hasMore: false,
      nextPage: null,
      total: 0,
    }
  }

  const safePage = Number.isFinite(page) && page && page > 0 ? page : 1
  const clampedPageSize =
    Number.isFinite(pageSize) && pageSize && pageSize > 0
      ? Math.min(pageSize, 48)
      : ALTERNATIVE_DETAIL_PAGE_SIZE

  const skip = (safePage - 1) * clampedPageSize

  const baseWhere: Prisma.ProductWhereInput = buildPublicDiscoveryProductWhere({
    alternatives: {
      some: { id: alternativeId },
    },
  })

  const now = new Date()
  const priorityPlanIds = await getPriorityPlacementPlanIds()

  const priorityWhere: Prisma.ProductWhereInput = {
    AND: [baseWhere, buildPriorityPlanFilter(priorityPlanIds, now)],
  }

  const regularWhere: Prisma.ProductWhereInput = {
    AND: [baseWhere, buildRegularPlanFilter(priorityPlanIds, now)],
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { analytics: { upvotes: "desc" } },
    { createdAt: "desc" },
    { name: "asc" },
  ]

  const [totalPriority, totalRegular] = priorityPlanIds.length
    ? await Promise.all([
        prisma.product.count({ where: priorityWhere }),
        prisma.product.count({ where: regularWhere }),
      ])
    : [0, await prisma.product.count({ where: baseWhere })]

  const total = totalPriority + totalRegular

  let prioritySkip = 0
  let priorityTake = 0
  let regularSkip = 0
  let regularTake = 0

  if (skip < totalPriority) {
    prioritySkip = skip
    priorityTake = Math.min(clampedPageSize, totalPriority - prioritySkip)
    regularSkip = 0
    regularTake = Math.max(0, clampedPageSize - priorityTake)
  } else {
    prioritySkip = totalPriority
    priorityTake = 0
    regularSkip = skip - totalPriority
    regularTake = clampedPageSize
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
  const baseItems = allProducts.map((product) =>
    mapProductCardRecordToBase(product, now, {
      scoreByProductId: scoreMap,
      priorityPlanIds,
      placementNow: now,
    }),
  )

  const interestMap = await getProductInterestSignalsMap({
    products: baseItems.map((product) => ({
      id: product.id,
      slug: product.slug,
    })),
  })

  const items = baseItems.map((product) => ({
    ...product,
    interest: interestMap.get(product.id) ?? null,
  }))

  const hasMore = skip + items.length < total

  return {
    items,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
    total,
  }
}
