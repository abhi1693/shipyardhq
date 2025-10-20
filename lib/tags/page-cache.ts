import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getKeywordTagSummaries,
  getKeywordTagProducts,
  type KeywordTagProductsResult,
  type KeywordTagSummary,
} from "@/actions/public/tags/actions"

type TagsIndexPayload = {
  summaries: KeywordTagSummary[]
  activeSummary: KeywordTagSummary
  activeProducts: KeywordTagProductsResult | null
}

export const getTagsIndexPayload = cached(
  async (page: number = 1): Promise<TagsIndexPayload> => {
    const summaries = await getKeywordTagSummaries()
    const activeSummary = summaries[0]

    const activeProducts = activeSummary
      ? await getKeywordTagProducts(activeSummary.slug, page)
      : null

    return {
      summaries,
      activeSummary,
      activeProducts,
    }
  },
  "tags:index:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: ([page]) => [`page:${page}`],
    tags: () => [TAGS.tagsPage, TAGS.keywords],
  },
)

type TagDetailPayload = {
  summary: KeywordTagSummary
  products: KeywordTagProductsResult
  summaries: KeywordTagSummary[]
}

export const getTagDetailPayload = cached(
  async (
    slug: string,
    page: number = 1,
  ): Promise<TagDetailPayload | null> => {
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
