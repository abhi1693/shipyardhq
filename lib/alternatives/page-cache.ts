import {
  getAlternativeMomentumCounts,
  getAlternativesWithCounts,
  type AlternativeCatalogItem,
} from "@/actions/public/alternatives/actions"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"

type AlternativesPagePayload = {
  alternatives: AlternativeCatalogItem[]
  highlightAlternatives: AlternativeCatalogItem[]
  momentumByAlternativeId: Record<string, number>
  alternativeCount: number
  totalProducts: number
  averagePerAlternative: number
  busiestAlternative: AlternativeCatalogItem | null
}

const TRENDING_WINDOW_DAYS = 7

const getTrendingWindowStart = () => {
  const windowStart = new Date()
  windowStart.setUTCDate(windowStart.getUTCDate() - TRENDING_WINDOW_DAYS)
  windowStart.setUTCHours(0, 0, 0, 0)
  return windowStart
}

export async function getAlternativesPagePayload(): Promise<AlternativesPagePayload> {
  "use cache"
  applyCache(
    ["alternative-products:page:payload:v2", TAGS.alternativeProducts],
    DEFAULT_TTL.slow,
  )

  const windowStart = getTrendingWindowStart()
  const [alternatives, momentumCounts] = await Promise.all([
    getAlternativesWithCounts(),
    getAlternativeMomentumCounts(windowStart),
  ])
  const recentProductCountById = new Map(
    momentumCounts.map((item) => [item.id, item.recentProducts] as const),
  )
  const momentumByAlternativeId = Object.fromEntries(
    alternatives.map((alternative) => {
      const totalProducts = alternative._count.products
      const recentProducts = recentProductCountById.get(alternative.id) ?? 0
      const momentum = totalProducts
        ? (recentProducts / totalProducts) * 100
        : 0

      return [alternative.id, momentum]
    }),
  )
  const sortedByProducts = [...alternatives].sort(
    (a, b) => b._count.products - a._count.products,
  )
  const sortedByMomentum = [...alternatives].sort((a, b) => {
    const recentDelta =
      (recentProductCountById.get(b.id) ?? 0) -
      (recentProductCountById.get(a.id) ?? 0)
    if (recentDelta) return recentDelta

    const momentumDelta =
      momentumByAlternativeId[b.id] - momentumByAlternativeId[a.id]
    if (momentumDelta) return momentumDelta

    const productDelta = b._count.products - a._count.products
    if (productDelta) return productDelta

    return a.name.localeCompare(b.name)
  })
  const totalProducts = alternatives.reduce(
    (sum, alternative) => sum + alternative._count.products,
    0,
  )
  const alternativeCount = alternatives.length

  return {
    alternatives,
    highlightAlternatives: sortedByMomentum
      .filter((alternative) => momentumByAlternativeId[alternative.id] > 0)
      .slice(0, 6),
    momentumByAlternativeId,
    alternativeCount,
    totalProducts,
    averagePerAlternative: alternativeCount
      ? Math.round(totalProducts / alternativeCount)
      : 0,
    busiestAlternative: sortedByProducts[0] ?? null,
  }
}
