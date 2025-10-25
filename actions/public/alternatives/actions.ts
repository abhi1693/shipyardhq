import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"

const ALTERNATIVE_CARD_INCLUDE = Prisma.validator<
  Prisma.AlternativeProductInclude
>()({
  _count: {
    select: {
      products: true,
    },
  },
})

const ALTERNATIVE_DETAIL_SELECT = Prisma.validator<
  Prisma.AlternativeProductSelect
>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  websiteUrl: true,
  logoUrl: true,
})

const ALTERNATIVE_DETAIL_PRODUCT_SELECT = Prisma.validator<
  Prisma.ProductSelect
>()({
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  analytics: { select: { upvotes: true } },
  category: { select: { name: true } },
})

export type AlternativeCatalogItem = Prisma.AlternativeProductGetPayload<{
  include: typeof ALTERNATIVE_CARD_INCLUDE
}>

export type AlternativeDetail = Prisma.AlternativeProductGetPayload<{
  select: typeof ALTERNATIVE_DETAIL_SELECT
}>

export type AlternativeDetailProduct = Prisma.ProductGetPayload<{
  select: typeof ALTERNATIVE_DETAIL_PRODUCT_SELECT
}>

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

type AlternativeCatalogStats = {
  totalAlternatives: number
  linkedProducts: number
  categoriesCovered: number
  totalPairings: number
}

export const getAlternativeCatalogStats = cached(
  async (): Promise<AlternativeCatalogStats> => {
    const activeAlternativeFilter: Prisma.AlternativeProductWhereInput = {
      products: { some: {} },
    }

    const [
      totalAlternatives,
      linkedProducts,
      categoriesCovered,
      pairings,
    ] = await Promise.all([
      prisma.alternativeProduct.count({
        where: activeAlternativeFilter,
      }),
      prisma.product.count({
        where: { alternatives: { some: {} } },
      }),
      prisma.category.count({
        where: {
          alternativeProducts: {
            some: {
              products: { some: {} },
            },
          },
        },
      }),
      prisma.alternativeProduct.findMany({
        where: activeAlternativeFilter,
        include: { _count: { select: { products: true } } },
      }),
    ])

    const totalPairings = pairings.reduce(
      (sum, entry) => sum + entry._count.products,
      0,
    )

    return {
      totalAlternatives,
      linkedProducts,
      categoriesCovered,
      totalPairings,
    }
  },
  "alternative-products:stats",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.alternativeProducts],
  },
)

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
  async ({
    excludeId,
    take = 6,
  }: GetFeaturedAlternativesOptions = {}): Promise<AlternativeCatalogItem[]> => {
    const sanitizedTake = Math.min(Math.max(take, 1), 12)

    const records = await prisma.alternativeProduct.findMany({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        products: { some: {} },
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

    const baseWhere: Prisma.ProductWhereInput = {
      status: "published",
      alternatives: {
        some: { id: alternativeId },
      },
    }

    const PRIORITY_KEY = "priorityPlacement"

    const planExclusionWhere: Prisma.ProductWhereInput = {
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

    const priorityWhere: Prisma.ProductWhereInput = {
      ...baseWhere,
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
      AND: [baseWhere, planExclusionWhere],
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { analytics: { upvotes: "desc" } },
      { createdAt: "desc" },
      { name: "asc" },
    ]

    const [totalPriority, totalRegular] = await Promise.all([
      prisma.product.count({ where: priorityWhere }),
      prisma.product.count({ where: regularWhere }),
    ])

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
            select: ALTERNATIVE_DETAIL_PRODUCT_SELECT,
          })
        : Promise.resolve([] as AlternativeDetailProduct[]),
      regularTake
        ? prisma.product.findMany({
            where: regularWhere,
            orderBy,
            skip: regularSkip,
            take: regularTake,
            select: ALTERNATIVE_DETAIL_PRODUCT_SELECT,
          })
        : Promise.resolve([] as AlternativeDetailProduct[]),
    ])

    const items: AlternativeDetailProduct[] = [
      ...priorityProducts,
      ...regularProducts,
    ]

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
      products: { some: {} },
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
                  some: {
                    name: { contains: trimmedQuery, mode: "insensitive" },
                  },
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
