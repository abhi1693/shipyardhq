"use server"

import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"

const categoryProductSelect = productCardSelect satisfies Prisma.ProductSelect

const CATEGORY_PRODUCTS_PAGE_SIZE = 20
const MAX_CATEGORY_PRODUCTS_PAGE_SIZE = 50

type CategoryProductsPageResult = {
  products: HomepageFeedItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        products: {
          where: {
            status: "published"
          }
        }
      }
    }
  }
}>

type CategoryProductsPage = {
  category: {
    id: string
    name: string
    slug: string
    description: string | null
    icon: string | null
  }
  products: HomepageFeedItem[]
} & CategoryProductsPageResult

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

const normalizePage = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

const normalizePageSize = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  const clamped = Math.min(Math.floor(parsed), MAX_CATEGORY_PRODUCTS_PAGE_SIZE)
  return Math.max(1, clamped)
}

const coerceDateString = (value?: string | Date | null) => {
  if (!value) return ""
  return value instanceof Date ? value.toISOString() : String(value)
}

const mapProductToFeedItem = (
  product: ReturnType<typeof mapProductCardRecordToBase>,
): HomepageFeedItem => {
  const badges = product.badges ?? []
  const categoryName = product.category?.name ?? null
  const categorySlug = product.category?.slug ?? null
  const isSponsored = Boolean(product.sponsored)
  const variant = isSponsored ? "sponsored" : "default"

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: coerceDateString(product.createdAt),
    updatedAt: coerceDateString(product.updatedAt),
    badges,
    category: categoryName,
    categorySlug,
    scoreCount:
      typeof product.scoreCount === "number" ? product.scoreCount : undefined,
    isSponsored,
    isVoted: false,
    isVerified: Boolean(product.isVerified),
    variant,
    latestRevenueCents:
      typeof product.latestRevenueCents === "number"
        ? product.latestRevenueCents
        : null,
    revenueCurrencyCode: product.revenueCurrencyCode ?? null,
    shuffleRank: Math.random(),
  }
}

export const getCategoriesWithCounts = cached(
  async () => {
    const categories = await prisma.category.findMany({
      where: {
        products: {
          some: {
            status: "published",
          },
        },
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: {
                status: "published",
              },
            },
          },
        },
      },
    })
    return categories.map((cat: CategoryWithCount) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      count: cat._count.products,
    }))
  },
  "categories:with-counts",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.categories] },
)

export const getCategoryMeta = cached(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: { name: true, description: true },
    }),
  "category:meta",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.categories, TAGS.category(String(slug))],
  },
)

export const getCategoryWithProducts = cached(
  async (
    slug: string,
    page: number = 1,
    pageSize: number = CATEGORY_PRODUCTS_PAGE_SIZE,
  ): Promise<CategoryProductsPage | null> => {
    const safePage = normalizePage(page, 1)
    const safePageSize = normalizePageSize(
      pageSize,
      CATEGORY_PRODUCTS_PAGE_SIZE,
    )
    const skip = (safePage - 1) * safePageSize

    const category = await prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
      },
    })

    if (!category) return null

    const where = {
      status: "published" as const,
      category: { slug },
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: categoryProductSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: safePageSize,
      }),
      prisma.product.count({ where }),
    ])

    const typedProducts = products as unknown as ProductCardRecord[]
    const productIds = typedProducts.map(
      (product: ProductCardRecord) => product.id,
    )
    const scoreMap = productIds.length
      ? await getCurrentScoreMap(productIds)
      : new Map<string, number>()

    const now = new Date()
    const feedItems = typedProducts.map((product: ProductCardRecord) =>
      mapProductToFeedItem(
        mapProductCardRecordToBase(product, now, {
          scoreByProductId: scoreMap,
        }),
      ),
    )

    const hasMore = skip + feedItems.length < total

    return {
      category,
      products: feedItems,
      total,
      page: safePage,
      pageSize: safePageSize,
      hasMore,
      nextPage: hasMore ? safePage + 1 : null,
    }
  },
  "category:with-products",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([slug, page, pageSize]) => [
      slug,
      `page:${normalizePage(page, 1)}`,
      `pageSize:${normalizePageSize(pageSize, CATEGORY_PRODUCTS_PAGE_SIZE)}`,
    ],
    tags: ([slug]) => [
      TAGS.categories,
      TAGS.products,
      TAGS.category(String(slug)),
    ],
  },
)

export async function getCategoryProductsPage(params: {
  slug: string
  page?: number
  pageSize?: number
}): Promise<CategoryProductsPageResult> {
  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(
    params.pageSize,
    CATEGORY_PRODUCTS_PAGE_SIZE,
  )

  const result = await getCategoryWithProducts(
    params.slug,
    safePage,
    safePageSize,
  )

  if (!result) {
    return {
      products: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      hasMore: false,
      nextPage: null,
    }
  }

  return {
    products: result.products,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    nextPage: result.nextPage,
  }
}
