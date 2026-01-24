import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getTagDetailApiV1PublicTagsSlugDetailGet,
  getTagDirectoryApiV1PublicTagsDirectoryGet,
} from "@/lib/generated/fastapi/public-homepage"
import type {
  TagDetailPayload,
  TagSummary,
} from "@/lib/generated/fastapi/schemas"

type TagsIndexPayload = {
  initialItems: TagSummary[]
  hasMore: boolean
  totalTags: number
  pageSize: number
}

const TAG_DIRECTORY_PAGE_SIZE = 200

export const getTagsIndexPayload = cached(
  async (): Promise<TagsIndexPayload> => {
    const response = await getTagDirectoryApiV1PublicTagsDirectoryGet({
      page: 1,
      includeTotal: true,
    })
    if (response.status !== 200) {
      return {
        initialItems: [],
        hasMore: false,
        totalTags: 0,
        pageSize: TAG_DIRECTORY_PAGE_SIZE,
      }
    }
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

export const getTagDetailPayload = cached(
  async (slug: string, page: number = 1): Promise<TagDetailPayload | null> => {
    try {
      const response = await getTagDetailApiV1PublicTagsSlugDetailGet(slug, {
        page,
      })
      if (response.status !== 200) {
        return null
      }
      return response.data
    } catch {
      return null
    }
  },
  "tags:detail:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: ([slug, page]) => [slug, `page:${page}`],
    tags: ([slug]) => [TAGS.tagDetail(slug), TAGS.tagsPage, TAGS.keywords],
  },
)
