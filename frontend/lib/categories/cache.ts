import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getCategoriesDirectoryApiV1PublicCategoriesDirectoryGet } from "@/lib/generated/fastapi/public-homepage"
import type { CategoriesDirectoryPayload } from "@/lib/generated/fastapi/schemas"

export type CategoriesPagePayload = CategoriesDirectoryPayload

export const getCategoriesPagePayload = cached(
  async (): Promise<CategoriesPagePayload> => {
    const response =
      await getCategoriesDirectoryApiV1PublicCategoriesDirectoryGet()
    return response.data
  },
  "categories:page:payload",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.categoryDirectory, TAGS.categories, TAGS.products],
  },
)
