import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getKeywordTagSummaries,
  getKeywordTagProducts,
  type KeywordTagProductsResult,
  type KeywordTagSummary,
} from "@/actions/public/tags/actions"
import { getTagDirectoryApiV1PublicTagsDirectoryGet } from "@/lib/generated/fastapi/public-homepage"
import type { TagSummary } from "@/lib/generated/fastapi/schemas"

type TagsIndexPayload = {
  initialItems: TagSummary[]
  hasMore: boolean
  totalTags: number
  pageSize: number
}

export const getTagsIndexPayload = cached(
  async (): Promise<TagsIndexPayload> => {
    const response = await getTagDirectoryApiV1PublicTagsDirectoryGet({
      page: 1,
      includeTotal: true,
    })
    const result = response.data

    const pageSize = result.pageSize
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
    ttl: DEFAULT_TTL.slow,
    keyParts: () => [],
    tags: () => [TAGS.tagsPage, TAGS.keywords],
  },
)

type TagDetailPayload = {
  summary: KeywordTagSummary
  products: KeywordTagProductsResult
  summaries: KeywordTagSummary[]
}

export const getTagDetailPayload = cached(
  async (slug: string, page: number = 1): Promise<TagDetailPayload | null> => {
    const [summaries, products] = await Promise.all([
      getKeywordTagSummaries(),
      getKeywordTagProducts(slug, page),
    ])

    if (!products) {
      return null
    }

    return {
      summary: products.summary,
      products,
      summaries,
    }
  },
  "tags:detail:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: ([slug, page]) => [slug, `page:${page}`],
    tags: ([slug]) => [TAGS.tagDetail(slug), TAGS.tagsPage, TAGS.keywords],
  },
)
