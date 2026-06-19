import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
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

interface GetAlternativeCatalogPageOptions {
  page?: number
  pageSize?: number
  query?: string
}

const DEFAULT_PAGE_SIZE = 18
export const ALTERNATIVE_CATALOG_PAGE_SIZE = DEFAULT_PAGE_SIZE

export const ALTERNATIVE_DETAIL_PAGE_SIZE = 8

interface GetFeaturedAlternativesOptions {
  excludeId?: string
  take?: number
}

export const getAlternativeDetail = cached(
  async (slug: string): Promise<AlternativeDetail | null> => {
    if (!slug?.trim()) {
      return null
    }

    return prisma.alternativeProduct.findUnique({
      where: { slug },
      select: ALTERNATIVE_DETAIL_SELECT,
    })
  },
  "alternative-products:detail",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.alternativeProducts],
    keyParts: ([slug]) => slug,
  },
)

export const getFeaturedAlternatives = cached(
  async ({ excludeId, take = 6 }: GetFeaturedAlternativesOptions = {}): Promise<
    AlternativeCatalogItem[]
  > => {
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
  },
  "alternative-products:featured",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.alternativeProducts],
    keyParts: ([params]) => {
      const exclude = params?.excludeId ?? ""
      const take = params?.take ?? 6
      return [exclude, String(take)]
    },
  },
)

export const getAlternativesWithCounts = cached(
  async (): Promise<AlternativeCatalogItem[]> => {
    const records = await prisma.alternativeProduct.findMany({
      where: {
        products: { some: publicDiscoveryProductWhere },
      },
      orderBy: { name: "asc" },
      include: ALTERNATIVE_CARD_INCLUDE,
    })

    return records as AlternativeCatalogItem[]
  },
  "alternative-products:with-counts",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.alternativeProducts],
  },
)

export const getAlternativeMomentumCounts = cached(
  async (windowStart: Date): Promise<AlternativeMomentum[]> => {
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
  },
  "alternative-products:momentum-counts",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([windowStart]) => [windowStart.toISOString()],
    tags: () => [TAGS.alternativeProducts, TAGS.products],
  },
)

interface AlternativeProductsPageOptions {
  alternativeId: string
  page?: number
  pageSize?: number
}

export const getAlternativeProductsPage = cached(
  async ({
    alternativeId,
    page = 1,
    pageSize = ALTERNATIVE_DETAIL_PAGE_SIZE,
  }: AlternativeProductsPageOptions): Promise<{
    items: AlternativeDetailProduct[]
    hasMore: boolean
    nextPage: number | null
    total: number
  }> => {
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

    const baseWhere: Prisma.ProductWhereInput =
      buildPublicDiscoveryProductWhere({
        alternatives: {
          some: { id: alternativeId },
        },
      })

    const priorityPlanIds = await getPriorityPlacementPlanIds()

    const priorityWhere: Prisma.ProductWhereInput = {
      AND: [baseWhere, buildPriorityPlanFilter(priorityPlanIds)],
    }

    const regularWhere: Prisma.ProductWhereInput = {
      AND: [baseWhere, buildRegularPlanFilter(priorityPlanIds)],
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

    const now = new Date()
    const allProducts = [...priorityProducts, ...regularProducts]
    const scoreMap = await getCurrentScoreMap(allProducts.map((p) => p.id))
    const baseItems = allProducts.map((product) =>
      mapProductCardRecordToBase(product, now, { scoreByProductId: scoreMap }),
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
  },
  "alternative-products:detail-products",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.alternativeProducts, TAGS.products],
    keyParts: ([params]) => {
      if (!params?.alternativeId) {
        return null
      }
      const page = params.page ?? 1
      const pageSize = params.pageSize ?? ALTERNATIVE_DETAIL_PAGE_SIZE
      return [params.alternativeId, String(page), String(pageSize)]
    },
  },
)

export const getAlternativeCatalogPage = cached(
  async ({
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    query,
  }: GetAlternativeCatalogPageOptions = {}): Promise<{
    items: AlternativeCatalogItem[]
    hasMore: boolean
    nextPage: number | null
  }> => {
    const safePage = Number.isFinite(page) && page && page > 0 ? page : 1
    const clampedPageSize =
      Number.isFinite(pageSize) && pageSize && pageSize > 0
        ? Math.min(pageSize, 50)
        : DEFAULT_PAGE_SIZE

    const skip = (safePage - 1) * clampedPageSize
    const take = clampedPageSize + 1

    const trimmedQuery = query?.trim()
    const baseFilter: Prisma.AlternativeProductWhereInput = {
      products: { some: publicDiscoveryProductWhere },
    }
    const searchFilter: Prisma.AlternativeProductWhereInput | undefined =
      trimmedQuery && trimmedQuery.length
        ? {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { description: { contains: trimmedQuery, mode: "insensitive" } },
              {
                categories: {
                  some: {
                    name: { contains: trimmedQuery, mode: "insensitive" },
                  },
                },
              },
              {
                products: {
                  some: buildPublicDiscoveryProductWhere({
                    name: { contains: trimmedQuery, mode: "insensitive" },
                  }),
                },
              },
            ],
          }
        : undefined

    const where = searchFilter
      ? {
          AND: [baseFilter, searchFilter],
        }
      : baseFilter

    const records = await prisma.alternativeProduct.findMany({
      include: ALTERNATIVE_CARD_INCLUDE,
      where,
      orderBy: [{ name: "asc" }],
      skip,
      take,
    })

    const typedRecords = records as AlternativeCatalogItem[]

    const hasMore = typedRecords.length > clampedPageSize
    const items = hasMore
      ? typedRecords.slice(0, clampedPageSize)
      : typedRecords

    return {
      items,
      hasMore,
      nextPage: hasMore ? safePage + 1 : null,
    }
  },
  "alternative-products:catalog",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.alternativeProducts],
    keyParts: ([params]) => {
      const page = params?.page ?? 1
      const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE
      const query = params?.query ?? ""
      return [String(page), String(pageSize), query]
    },
  },
)
