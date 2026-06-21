import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
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

export async function getTagsIndexPayload(): Promise<TagsIndexPayload> {
  "use cache"
  applyCache(
    ["tags:index:payload", TAGS.tagsPage, TAGS.keywords],
    DEFAULT_TTL.slowest,
  )

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
}

type TagDetailPayload = {
  summary: KeywordTagSummary
  products: KeywordTagProductsResult
}

export async function getTagDetailPayload(
  slug: string,
  page: number = 1,
): Promise<TagDetailPayload | null> {
  "use cache"
  applyCache(
    ["tags:detail:payload", TAGS.tagDetail(slug), TAGS.tagsPage, TAGS.keywords],
    DEFAULT_TTL.slowest,
  )

  const products = await getKeywordTagProducts(slug, page)
  if (!products) {
    return null
  }

  return {
    summary: products.summary,
    products,
  }
}
