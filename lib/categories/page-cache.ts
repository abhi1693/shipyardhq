import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getCategoriesWithCounts,
  getCategoryWithProducts,
} from "@/actions/public/categories/actions"
import { getFeaturedByCategorySlug } from "@/actions/public/products/featured"
import { productHasFeature } from "@/lib/features"
import type { FeaturedProduct } from "@/types"

type CategoryFull = NonNullable<
  Awaited<ReturnType<typeof getCategoryWithProducts>>
>

type CategoryProduct = CategoryFull["products"][number]

export type CategoryDetailPayload = {
  category: CategoryFull["category"]
  products: Array<
    CategoryProduct & {
      priority: boolean
      badges: string[]
    }
  >
  featured: FeaturedProduct[]
  metrics: {
    totalProducts: number
    totalFeatured: number
    totalPriority: number
    totalUpvotes: number
    averageUpvotes: number
    latestLaunchName: string | null
    latestLaunchDate: string | null
  }
}

const serializeBadges = (product: CategoryProduct): string[] =>
  product.ProductBadge?.filter(
    (badge) => !badge.expiresAt || new Date(badge.expiresAt) > new Date(),
  ).map((badge) => badge.badge) ?? []

const serializeProduct = (product: CategoryProduct) => ({
  ...product,
  priority: productHasFeature(product, "priorityPlacement"),
  badges: serializeBadges(product),
})

const computeMetrics = (
  products: ReturnType<typeof serializeProduct>[],
  featuredCount: number,
) => {
  const totalProducts = products.length
  const totalFeatured = featuredCount
  const totalPriority = products.filter((product) => product.priority).length
  const totalUpvotes = products.reduce(
    (sum, product) => sum + (product.analytics?.upvotes ?? 0),
    0,
  )
  const averageUpvotes =
    totalProducts > 0 ? Math.round(totalUpvotes / totalProducts) : 0

  const latestLaunch = [...products]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .at(0)

  const latestLaunchDate = latestLaunch
    ? new Date(latestLaunch.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  return {
    totalProducts,
    totalFeatured,
    totalPriority,
    totalUpvotes,
    averageUpvotes,
    latestLaunchName: latestLaunch?.name ?? null,
    latestLaunchDate,
  }
}

export const getCategoryDetailPayload = cached(
  async (slug: string): Promise<CategoryDetailPayload | null> => {
    const [categoryData, featured] = await Promise.all([
      getCategoryWithProducts(slug),
      getFeaturedByCategorySlug(slug, 7),
    ])

    if (!categoryData) {
      return null
    }

    const serializedProducts = categoryData.products.map(serializeProduct)

    return {
      category: categoryData.category,
      products: serializedProducts,
      featured,
      metrics: computeMetrics(serializedProducts, featured.length),
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
      TAGS.featured,
    ],
  },
)

export const getCategoryStaticParams = cached(
  async () => {
    const categories = await getCategoriesWithCounts()
    return categories
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
