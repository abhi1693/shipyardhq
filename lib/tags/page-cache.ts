import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getKeywordTagProducts,
  getKeywordTagDirectoryPage,
  TAG_DIRECTORY_DEFAULT_PAGE_SIZE,
  type KeywordTagProductsResult,
  type KeywordTagSummary,
} from "@/actions/public/tags/actions"

type TagsIndexPayload = {
  initialItems: KeywordTagSummary[]
  hasMore: boolean
  totalTags: number
  pageSize: number
}

export const getTagsIndexPayload = cached(
  async (): Promise<TagsIndexPayload> => {
    const result = await getKeywordTagDirectoryPage({
      page: 1,
      pageSize: TAG_DIRECTORY_DEFAULT_PAGE_SIZE,
      includeTotal: true,
    })

    const pageSize = TAG_DIRECTORY_DEFAULT_PAGE_SIZE
    const initialItems = result.items
    const totalTags = result.total ?? initialItems.length

    return {
      initialItems,
      hasMore: result.hasMore,
      totalTags,
      pageSize,
    }
  },
  "tags:index:payload",
  {
    ttl: DEFAULT_TTL.slowest,
    keyParts: () => [],
    tags: () => [TAGS.tagsPage, TAGS.keywords],
  },
)

type TagDetailPayload = {
  summary: KeywordTagSummary
  products: KeywordTagProductsResult
}

export const getTagDetailPayload = cached(
  async (slug: string, page: number = 1): Promise<TagDetailPayload | null> => {
    const products = await getKeywordTagProducts(slug, page)
    if (!products) {
      return null
    }

    return {
      summary: products.summary,
      products,
    }
  },
  "tags:detail:payload",
  {
    ttl: DEFAULT_TTL.slowest,
    keyParts: ([slug, page]) => [slug, `page:${page}`],
    tags: ([slug]) => [TAGS.tagDetail(slug), TAGS.tagsPage, TAGS.keywords],
  },
)
