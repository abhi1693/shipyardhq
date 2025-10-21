import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicUseCaseWithProducts,
  getPublicUseCasesWithCounts,
} from "@/actions/public/use-cases/actions"

type UseCaseWithProducts = Awaited<
  ReturnType<typeof getPublicUseCaseWithProducts>
>

export type UseCasePagePayload = UseCaseWithProducts | null

export const getUseCasePagePayload = cached(
  async (slug: string): Promise<UseCasePagePayload> => {
    return getPublicUseCaseWithProducts(slug)
  },
  "usecases:detail:payload",
  {
    ttl: DEFAULT_TTL.slow,
    keyParts: ([slug]) => [slug],
    tags: ([slug]) => [TAGS.useCases, TAGS.usecase(slug)],
  },
)

export const getUseCaseStaticParams = cached(
  async () => {
    const useCases = await getPublicUseCasesWithCounts()
    return useCases
      .filter((useCase) => useCase.productCount > 0)
      .map((useCase) => ({ slug: useCase.slug }))
  },
  "usecases:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: () => [TAGS.useCases],
  },
)
