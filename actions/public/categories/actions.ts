"use server"

import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import type { ProductInterestSignals } from "@/types/product-interest"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { hasEditorPickBadge } from "@/lib/products/badges"

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

const CATEGORY_HIGHLIGHTS_DEFAULT_LIMIT = 6
const CATEGORY_HIGHLIGHTS_MAX_LIMIT = 12

const sanitizeCategoryHighlightLimit = (limit?: number) => {
  if (typeof limit !== "number") {
    return CATEGORY_HIGHLIGHTS_DEFAULT_LIMIT
  }
  if (!Number.isFinite(limit)) {
    return CATEGORY_HIGHLIGHTS_DEFAULT_LIMIT
  }
  const normalized = Math.trunc(limit)
  if (normalized <= 0) return 0
  return Math.min(normalized, CATEGORY_HIGHLIGHTS_MAX_LIMIT)
}

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
  interestByProductId?: Map<string, ProductInterestSignals>,
): HomepageFeedItem => {
  const badges = product.badges ?? []
  const categoryName = product.category?.name ?? null
  const categorySlug = product.category?.slug ?? null
  const isEditorPick = hasEditorPickBadge(badges)
  const isPriorityPlacement = Boolean(product.sponsored)
  const isSponsored = isPriorityPlacement || isEditorPick
  const variant = isPriorityPlacement
    ? "sponsored"
    : isEditorPick
      ? "promoted"
      : "default"

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
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount:
      typeof product.scoreCount === "number" ? product.scoreCount : undefined,
    isSponsored,
    isVoted: false,
    isVerified: Boolean(product.isVerified),
    variant,
    interest: interestByProductId?.get(product.id) ?? null,
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

export type CategoryHighlight = {
  id: string
  name: string
  slug: string
}

export const getCategoryHighlights = cached(
  async (
    limit: number = CATEGORY_HIGHLIGHTS_DEFAULT_LIMIT,
  ): Promise<CategoryHighlight[]> => {
    const safeLimit = sanitizeCategoryHighlightLimit(limit)
    if (safeLimit === 0) {
      return [] satisfies CategoryHighlight[]
    }

    const rows = await prisma.$queryRaw<CategoryHighlight[]>(Prisma.sql`
      SELECT c."id", c."name", c."slug"
      FROM "Category" c
      INNER JOIN "Product" p ON p."categoryId" = c."id"
      WHERE p."status" = 'published'
      GROUP BY c."id", c."name", c."slug"
      ORDER BY COUNT(p."id") DESC, c."name" ASC
      LIMIT ${safeLimit}
    `)

    return rows
  },
  "categories:highlights",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.categories, TAGS.products],
    keyParts: ([limit]) => [String(sanitizeCategoryHighlightLimit(limit))],
  },
)

export const getCategoryMeta = cached(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
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
      // Prefer filtering by `categoryId` to avoid an unnecessary join on Category.slug.
      categoryId: category.id,
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
    const baseProducts = typedProducts.map((product: ProductCardRecord) =>
      mapProductCardRecordToBase(product, now, {
        scoreByProductId: scoreMap,
      }),
    )

    const interestMap = await getProductInterestSignalsMap({
      products: baseProducts.map((product) => ({
        id: product.id,
        slug: product.slug,
      })),
    })

    const feedItems = baseProducts.map((product) =>
      mapProductToFeedItem(product, interestMap),
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
