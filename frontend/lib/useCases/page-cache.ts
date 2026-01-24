import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getUseCaseDetailApiV1PublicUseCasesSlugDetailGet,
  getUseCasesDirectoryApiV1PublicUseCasesDirectoryGet,
} from "@/lib/generated/fastapi/public-homepage"
import type {
  UseCaseDetailPayload,
  UseCasesDirectoryPayload,
} from "@/lib/generated/fastapi/schemas"

export type UseCasePagePayload = UseCaseDetailPayload | null
export type UseCasesPagePayload = UseCasesDirectoryPayload

export const getUseCasesPagePayload = cached(
  async (): Promise<UseCasesPagePayload> => {
    const response = await getUseCasesDirectoryApiV1PublicUseCasesDirectoryGet()
    if (response.status !== 200) {
      return {
        useCases: [],
        highlightUseCases: [],
        useCaseCount: 0,
        totalProducts: 0,
        averagePerUseCase: 0,
      }
    }
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
    try {
      const response =
        await getUseCaseDetailApiV1PublicUseCasesSlugDetailGet(slug)
      if (response.status !== 200) {
        return null
      }
      if (!response.data || response.data.productCount === 0) {
        return null
      }
      return response.data
    } catch {
      return null
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
    if (response.status !== 200) {
      return []
    }
    return response.data.useCases.map((useCase) => ({ slug: useCase.slug }))
  },
  "usecases:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: () => [TAGS.useCases],
  },
)
