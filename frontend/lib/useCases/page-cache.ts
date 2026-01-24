import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicUseCaseCategoriesWithCounts,
  type UseCaseCategoriesWithCounts,
} from "@/actions/public/use-cases/actions"
import { getUseCasesDirectoryApiV1PublicUseCasesDirectoryGet } from "@/lib/generated/fastapi/public-homepage"
import type { UseCasesDirectoryPayload } from "@/lib/generated/fastapi/schemas"

export type UseCasePagePayload =
  | (UseCaseCategoriesWithCounts & {
      hasProducts: boolean
    })
  | null
export type UseCasesPagePayload = UseCasesDirectoryPayload

export const getUseCasesPagePayload = cached(
  async (): Promise<UseCasesPagePayload> => {
    const response = await getUseCasesDirectoryApiV1PublicUseCasesDirectoryGet()
    return response.data
  },
  "usecases:page:payload",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.useCases, TAGS.products],
  },
)

export const getUseCasePagePayload = cached(
  async (slug: string): Promise<UseCasePagePayload> => {
    const categoriesResult = await getPublicUseCaseCategoriesWithCounts(slug)

    if (!categoriesResult || categoriesResult.productCount === 0) {
      return null
    }

    return {
      ...categoriesResult,
      hasProducts: categoriesResult.productCount > 0,
    }
  },
  "usecases:detail:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: ([slug]) => [slug],
    tags: ([slug]) => [
      TAGS.useCases,
      TAGS.usecase(slug),
      TAGS.products,
      TAGS.categories,
    ],
  },
)

export const getUseCaseStaticParams = cached(
  async () => {
    const response = await getUseCasesDirectoryApiV1PublicUseCasesDirectoryGet()
    return response.data.useCases.map((useCase) => ({ slug: useCase.slug }))
  },
  "usecases:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: () => [TAGS.useCases],
  },
)
