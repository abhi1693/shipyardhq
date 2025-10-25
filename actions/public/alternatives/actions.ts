import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"

const ALTERNATIVE_CARD_SELECT = {
  id: true,
  name: true,
  description: true,
  websiteUrl: true,
  logoUrl: true,
  _count: {
    select: {
      products: true,
    },
  },
} satisfies Prisma.AlternativeProductSelect

export type AlternativeCatalogItem = Prisma.AlternativeProductGetPayload<{
  select: typeof ALTERNATIVE_CARD_SELECT
}>

interface GetAlternativeCatalogPageOptions {
  page?: number
  pageSize?: number
  query?: string
}

const DEFAULT_PAGE_SIZE = 18
export const ALTERNATIVE_CATALOG_PAGE_SIZE = DEFAULT_PAGE_SIZE

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
        select: { _count: { select: { products: true } } },
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

export const getAlternativeCatalogPage = cached(
  async ({
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    query,
  }: GetAlternativeCatalogPageOptions = {}) => {
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
      select: ALTERNATIVE_CARD_SELECT,
      where,
      orderBy: [{ name: "asc" }],
      skip,
      take,
    })

    const hasMore = records.length > clampedPageSize
    const items = hasMore ? records.slice(0, clampedPageSize) : records

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
