export interface TrendRadarCategoryInput {
  id: string
  slug: string
  name: string
  icon?: string | null
  productCount: number
}

export interface TrendRadarTrendingInput {
  categoryName?: string | null
  upvotes?: number | null
}

export interface TrendRadarCategoryMetrics {
  id: string
  slug: string
  name: string
  icon?: string | null
  productCount: number
  trendingCount: number
  trendingUpvotes: number
  catalogShare: number
  normalizedDepth: number
  normalizedMomentum: number
  normalizedSignal: number
  momentumPerProduct: number
  upvotesPerLaunch: number
}

export interface ComputeTrendRadarOptions {
  limit?: number
  totalProducts?: number
}

export interface TrendRadarResult {
  metrics: TrendRadarCategoryMetrics[]
  totals: {
    products: number
    trendingProducts: number
    upvotes: number
  }
}

export const TREND_RADAR_CATEGORY_LIMIT = 6

const normalizeScore = (value: number, max: number) => {
  if (max <= 0 || !Number.isFinite(value)) {
    return 0
  }

  const raw = (value / max) * 100
  return Number.isFinite(raw) ? Math.round(raw) : 0
}

export function computeTrendRadarMetrics(
  categories: TrendRadarCategoryInput[],
  trending: TrendRadarTrendingInput[],
  options: ComputeTrendRadarOptions = {},
): TrendRadarResult {
  const { limit = TREND_RADAR_CATEGORY_LIMIT, totalProducts } = options
  if (!Array.isArray(categories) || !categories.length) {
    return {
      metrics: [],
      totals: { products: 0, trendingProducts: 0, upvotes: 0 },
    }
  }

  const filteredCategories = categories
    .filter((category) => (category?.productCount ?? 0) > 0)
    .sort((a, b) => b.productCount - a.productCount)

  const effectiveLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.max(1, Math.trunc(limit))
      : undefined
  const trimmedCategories =
    typeof effectiveLimit === "number"
      ? filteredCategories.slice(0, effectiveLimit)
      : filteredCategories

  const totalCatalogProducts =
    typeof totalProducts === "number" && totalProducts > 0
      ? totalProducts
      : trimmedCategories.reduce(
          (sum, category) => sum + category.productCount,
          0,
        )

  const trendingByCategory = new Map<
    string,
    { count: number; upvotes: number }
  >()

  for (const entry of trending) {
    if (!entry) continue
    const key = (entry.categoryName ?? "").trim().toLowerCase()
    if (!key) continue
    const current = trendingByCategory.get(key) ?? { count: 0, upvotes: 0 }
    current.count += 1
    if (typeof entry.upvotes === "number" && Number.isFinite(entry.upvotes)) {
      current.upvotes += entry.upvotes
    }
    trendingByCategory.set(key, current)
  }

  const maxProducts = Math.max(
    ...trimmedCategories.map((category) => category.productCount),
    0,
  )
  const maxTrendingCount = Math.max(
    ...trimmedCategories.map((category) => {
      const key = category.name.trim().toLowerCase()
      return trendingByCategory.get(key)?.count ?? 0
    }),
    0,
  )
  const maxTrendingUpvotes = Math.max(
    ...trimmedCategories.map((category) => {
      const key = category.name.trim().toLowerCase()
      return trendingByCategory.get(key)?.upvotes ?? 0
    }),
    0,
  )

  const metrics = trimmedCategories.map((category) => {
    const key = category.name.trim().toLowerCase()
    const trendingStats = trendingByCategory.get(key) ?? {
      count: 0,
      upvotes: 0,
    }

    const catalogShare =
      totalCatalogProducts > 0
        ? category.productCount / totalCatalogProducts
        : 0

    const normalizedDepth = normalizeScore(category.productCount, maxProducts)

    const normalizedMomentum =
      maxTrendingCount > 0
        ? normalizeScore(trendingStats.count, maxTrendingCount)
        : normalizeScore(category.productCount, maxProducts)

    const normalizedSignal =
      maxTrendingUpvotes > 0
        ? normalizeScore(trendingStats.upvotes, maxTrendingUpvotes)
        : maxTrendingCount > 0
          ? normalizeScore(trendingStats.count, maxTrendingCount)
          : normalizeScore(category.productCount, maxProducts)

    const momentumPerProduct =
      category.productCount > 0
        ? Number((trendingStats.count / category.productCount).toFixed(2))
        : 0

    const upvotesPerLaunch =
      category.productCount > 0
        ? Number((trendingStats.upvotes / category.productCount).toFixed(1))
        : 0

    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      productCount: category.productCount,
      trendingCount: trendingStats.count,
      trendingUpvotes: trendingStats.upvotes,
      catalogShare,
      normalizedDepth,
      normalizedMomentum,
      normalizedSignal,
      momentumPerProduct,
      upvotesPerLaunch,
    }
  })

  const totals = metrics.reduce(
    (acc, metric) => {
      acc.products += metric.productCount
      acc.trendingProducts += metric.trendingCount
      acc.upvotes += metric.trendingUpvotes
      return acc
    },
    { products: 0, trendingProducts: 0, upvotes: 0 },
  )

  return { metrics, totals }
}
