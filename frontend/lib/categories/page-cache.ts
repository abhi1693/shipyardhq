import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getCategoriesDirectoryApiV1PublicCategoriesDirectoryGet,
  getCategoryDetailApiV1PublicCategoriesSlugDetailGet,
} from "@/lib/generated/fastapi/public-homepage"
import type { CategoryDetailPayload } from "@/lib/generated/fastapi/schemas"

export type CategoryDetailPayloadResult = CategoryDetailPayload

export const getCategoryDetailPayload = cached(
  async (slug: string): Promise<CategoryDetailPayloadResult | null> => {
    try {
      const response = await getCategoryDetailApiV1PublicCategoriesSlugDetailGet(
        slug,
      )
      return response.data
    } catch {
      return null
    }
  },
  "category:detail:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([slug]) => [slug],
    tags: ([slug]) => [
      TAGS.categoryDirectory,
      TAGS.categories,
      TAGS.category(slug),
      TAGS.products,
    ],
  },
)

export const getCategoryStaticParams = cached(
  async () => {
    const response =
      await getCategoriesDirectoryApiV1PublicCategoriesDirectoryGet()
    return response.data.categories
      .filter((category) => category.slug && category.count > 0)
      .map((category) => ({
        slug: category.slug,
      }))
  },
  "categories:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: () => [TAGS.categories],
  },
)
