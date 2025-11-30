import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicUseCaseCategoriesWithCounts,
  getPublicUseCasesWithCounts,
  type UseCaseCategoriesWithCounts,
} from "@/actions/public/use-cases/actions"

type UseCasesWithCounts = Awaited<ReturnType<typeof getPublicUseCasesWithCounts>>

export type UseCasePagePayload =
  | (UseCaseCategoriesWithCounts & {
      hasProducts: boolean
    })
  | null
export type UseCasesPagePayload = {
  useCases: UseCasesWithCounts
  highlightUseCases: UseCasesWithCounts
  useCaseCount: number
  totalProducts: number
  averagePerUseCase: number
}

export const getUseCasesPagePayload = cached(
  async (): Promise<UseCasesPagePayload> => {
    const useCases = await getPublicUseCasesWithCounts()
    const withProducts = useCases.filter((useCase) => useCase.productCount > 0)
    const sortedByCount = [...withProducts].sort(
      (a, b) => b.productCount - a.productCount,
    )

    const totalProducts = withProducts.reduce(
      (sum, useCase) => sum + (useCase.productCount ?? 0),
      0,
    )
    const useCaseCount = withProducts.length
    const averagePerUseCase =
      useCaseCount > 0
        ? Math.max(1, Math.round(totalProducts / useCaseCount))
        : 0

    return {
      useCases: withProducts,
      highlightUseCases: sortedByCount.slice(0, 8),
      useCaseCount,
      totalProducts,
      averagePerUseCase,
    }
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
