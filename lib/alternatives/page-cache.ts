import prisma from "@/lib/prisma"
import {
  ALTERNATIVE_CATALOG_PAGE_SIZE,
  getAlternativeCatalogPage,
  type AlternativeCatalogItem,
} from "@/actions/public/alternatives/actions"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

type AlternativesIndexPayload = {
  initialItems: AlternativeCatalogItem[]
  initialHasMore: boolean
  pageSize: number
}

export const getAlternativesIndexPayload = cached(
  async (): Promise<AlternativesIndexPayload> => {
    const result = await getAlternativeCatalogPage({
      page: 1,
      pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
    })

    return {
      initialItems: result.items,
      initialHasMore: result.hasMore,
      pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
    }
  },
  "alternative-products:index:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: () => [],
    tags: () => [TAGS.alternativeProducts],
  },
)

export const getAlternativeStaticParams = cached(
  async () => {
    const alternatives = await prisma.alternativeProduct.findMany({
      where: {
        products: {
          some: {},
        },
      },
      select: {
        slug: true,
      },
      orderBy: {
        slug: "asc",
      },
    })

    return alternatives
      .map(
        (alternative: (typeof alternatives)[number]) => alternative.slug,
      )
      .filter(
        (slug: string | undefined | null): slug is string =>
          Boolean(slug?.trim()),
      )
      .map((slug: string) => ({ slug }))
  },
  "alternative-products:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    keyParts: () => [],
    tags: () => [TAGS.alternativeProducts],
  },
)
