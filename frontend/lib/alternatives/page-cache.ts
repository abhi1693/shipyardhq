import type { AlternativeCatalogItem } from "@/lib/generated/fastapi/schemas"
import { getAlternativeCatalogApiV1PublicAlternativesCatalogGet } from "@/lib/generated/fastapi/public-homepage"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

const ALTERNATIVE_CATALOG_PAGE_SIZE = 18

type AlternativesIndexPayload = {
  initialItems: AlternativeCatalogItem[]
  initialHasMore: boolean
  pageSize: number
}

export const getAlternativesIndexPayload = cached(
  async (): Promise<AlternativesIndexPayload> => {
    const response = await getAlternativeCatalogApiV1PublicAlternativesCatalogGet({
      page: 1,
      pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
    })
    const result = response.data

    return {
      initialItems: result.items,
      initialHasMore: result.hasMore,
      pageSize: result.pageSize,
    }
  },
  "alternative-products:index:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: () => [],
    tags: () => [TAGS.alternativeProducts],
  },
)
