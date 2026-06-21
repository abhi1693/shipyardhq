import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { safelyReadStaticParams } from "@/lib/staticParams"
import {
  getCategoriesWithCounts,
  getCategoryWithProducts,
} from "@/actions/public/categories/actions"
import { getFeaturedByCategorySlug } from "@/actions/public/products/featured"
import type { FeaturedProduct } from "@/types"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"

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

  const productCategoryWhere = buildPublicDiscoveryProductWhere({
    OR: [{ categoryId }, { categories: { some: { categoryId } } }],
  })

  const priorityPlanIds = await getPriorityPlacementPlanIds()

  const [priorityCount, upvotes] = await Promise.all([
    prisma.product.count({
      where: {
        ...productCategoryWhere,
        planId: { in: priorityPlanIds },
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

export async function getCategoryDetailPayload(
  slug: string,
): Promise<CategoryDetailPayload | null> {
  "use cache"
  applyCache(
    [
      "category:detail:payload",
      TAGS.categoryDirectory,
      TAGS.categories,
      TAGS.category(slug),
      TAGS.products,
      TAGS.featured,
    ],
    DEFAULT_TTL.medium,
  )

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
}

export async function getCategoryStaticParams() {
  "use cache"
  applyCache(["categories:static-params", TAGS.categories], DEFAULT_TTL.slowest)

  return safelyReadStaticParams("category pages", async () => {
    const categories = await getCategoriesWithCounts()
    return categories
      .filter(
        (category: (typeof categories)[number]) =>
          category.slug && category.count > 0,
      )
      .map((category: (typeof categories)[number]) => ({
        slug: category.slug,
      }))
  })
}
