import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { safelyReadStaticParams } from "@/lib/staticParams"
import {
  getCategoriesWithCounts,
  getCategoryWithProducts,
} from "@/actions/public/categories/actions"
import { getFeaturedByCategorySlug } from "@/actions/public/products/featured"
import { PRIORITY_FEATURE_KEY } from "@/lib/products/selects"
import type { FeaturedProduct } from "@/types"

type CategoryPageResult = NonNullable<
  Awaited<ReturnType<typeof getCategoryWithProducts>>
>

type CategoryProductsPage = {
  products: CategoryPageResult["products"]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

type CategoryMetrics = {
  totalProducts: number
  totalFeatured: number
  totalPriority: number
  totalUpvotes: number
  averageUpvotes: number
  latestLaunchName: string | null
  latestLaunchDate: string | null
}

export type CategoryDetailPayload = {
  category: CategoryPageResult["category"]
  productsPage: CategoryProductsPage
  featured: FeaturedProduct[]
  metrics: CategoryMetrics
}

const formatLatestLaunchDate = (value?: string) => {
  if (!value) return null
  const createdAt = new Date(value)
  if (Number.isNaN(createdAt.getTime())) return null

  return createdAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const buildCategoryMetrics = async (
  categoryId: string,
  page: CategoryPageResult,
  featuredCount: number,
): Promise<CategoryMetrics> => {
  const totalProducts = page.total
  const latestLaunch = page.products.at(0)
  const latestLaunchDate = formatLatestLaunchDate(latestLaunch?.createdAt)

  if (!totalProducts) {
    return {
      totalProducts: 0,
      totalFeatured: featuredCount,
      totalPriority: 0,
      totalUpvotes: 0,
      averageUpvotes: 0,
      latestLaunchName: latestLaunch?.name ?? null,
      latestLaunchDate,
    }
  }

  const productCategoryWhere = {
    status: "published" as const,
    OR: [{ categoryId }, { categories: { some: { categoryId } } }],
  }

  const [priorityCount, upvotes] = await Promise.all([
    prisma.product.count({
      where: {
        ...productCategoryWhere,
        plan: {
          is: {
            assignments: {
              some: {
                enabled: true,
                feature: { key: PRIORITY_FEATURE_KEY },
              },
            },
          },
        },
      },
    }),
    prisma.productAnalytics.aggregate({
      _sum: { upvotes: true },
      where: {
        product: productCategoryWhere,
      },
    }),
  ])

  const totalUpvotes = Number(upvotes._sum?.upvotes ?? 0)
  const averageUpvotes =
    totalProducts > 0 ? Math.round(totalUpvotes / totalProducts) : 0

  return {
    totalProducts,
    totalFeatured: featuredCount,
    totalPriority: priorityCount,
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

    const metrics = await buildCategoryMetrics(
      categoryData.category.id,
      categoryData,
      featured.length,
    )

    return {
      category: categoryData.category,
      productsPage: {
        products: categoryData.products,
        total: categoryData.total,
        page: categoryData.page,
        pageSize: categoryData.pageSize,
        hasMore: categoryData.hasMore,
        nextPage: categoryData.nextPage,
      },
      featured,
      metrics,
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
  async () =>
    safelyReadStaticParams("category pages", async () => {
      const categories = await getCategoriesWithCounts()
      return categories
        .filter(
          (category: (typeof categories)[number]) =>
            category.slug && category.count > 0,
        )
        .map((category: (typeof categories)[number]) => ({
          slug: category.slug,
        }))
    }),
  "categories:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: () => [TAGS.categories],
  },
)
