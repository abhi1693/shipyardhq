import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import type { ProductInterestSignals } from "@/types/product-interest"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import {
  buildCatalogQueryCacheKey,
  cacheCatalogQuery,
} from "@/lib/server/catalog-query-cache"
import { hasEditorPickBadge } from "@/lib/products/badges"
import {
  buildPublicDiscoveryProductWhere,
  buildPublicDiscoverySqlFilter,
} from "@/lib/products/public-discovery"

const categoryProductSelect = productCardSelect satisfies Prisma.ProductSelect
const publicDiscoveryProductWhere = buildPublicDiscoveryProductWhere()

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
    categories: product.categories ?? [],
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount:
      typeof product.scoreCount === "number" ? product.scoreCount : undefined,
    isSponsored: isPriorityPlacement,
    isVoted: false,
    isVerified: Boolean(product.isVerified),
    variant,
    interest: interestByProductId?.get(product.id) ?? null,
    shuffleRank: Math.random(),
  }
}

export async function getCategoriesWithCounts() {
  "use cache"
  applyCache([TAGS.categories], DEFAULT_TTL.slow)

  return cacheCatalogQuery({
    key: buildCatalogQueryCacheKey("public-categories-with-counts"),
    ttlSeconds: DEFAULT_TTL.slow,
    loader: async () => {
      const categories = await prisma.category.findMany({
        where: {
          productAssignments: {
            some: {
              product: {
                ...publicDiscoveryProductWhere,
              },
            },
          },
        },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              productAssignments: {
                where: {
                  product: {
                    ...publicDiscoveryProductWhere,
                  },
                },
              },
            },
          },
        },
      })

      return categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        count: cat._count.productAssignments,
      }))
    },
  })
}

export type CategoryHighlight = {
  id: string
  name: string
  slug: string
}

export async function getCategoryHighlights(
  limit: number = CATEGORY_HIGHLIGHTS_DEFAULT_LIMIT,
): Promise<CategoryHighlight[]> {
  "use cache"
  applyCache([TAGS.categories, TAGS.products], DEFAULT_TTL.slow)

  const safeLimit = sanitizeCategoryHighlightLimit(limit)
  if (safeLimit === 0) {
    return [] satisfies CategoryHighlight[]
  }

  return cacheCatalogQuery({
    key: buildCatalogQueryCacheKey("category-highlights", {
      limit: safeLimit,
    }),
    ttlSeconds: DEFAULT_TTL.slow,
    loader: () =>
      prisma.$queryRaw<CategoryHighlight[]>(Prisma.sql`
        SELECT c."id", c."name", c."slug"
        FROM "Category" c
        INNER JOIN "ProductCategory" pc ON pc."categoryId" = c."id"
        INNER JOIN "Product" p ON p."id" = pc."productId"
        WHERE p."status" = 'published'
          ${buildPublicDiscoverySqlFilter("p")}
        GROUP BY c."id", c."name", c."slug"
        ORDER BY COUNT(DISTINCT p."id") DESC, c."name" ASC
        LIMIT ${safeLimit}
      `),
  })
}

export async function getCategoryMeta(slug: string) {
  "use cache"
  applyCache([TAGS.categories, TAGS.category(String(slug))], DEFAULT_TTL.medium)

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      _count: {
        select: {
          productAssignments: {
            where: {
              product: {
                ...publicDiscoveryProductWhere,
              },
            },
          },
        },
      },
    },
  })

  if (!category) return null

  return {
    name: category.name,
    description: category.description,
    _count: {
      products: category._count.productAssignments,
    },
  }
}

export async function getCategoryWithProducts(
  slug: string,
  page: number = 1,
  pageSize: number = CATEGORY_PRODUCTS_PAGE_SIZE,
): Promise<CategoryProductsPage | null> {
  "use cache"
  applyCache(
    [TAGS.categories, TAGS.products, TAGS.category(String(slug))],
    DEFAULT_TTL.medium,
  )

  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, CATEGORY_PRODUCTS_PAGE_SIZE)
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

  const where = buildPublicDiscoveryProductWhere({
    OR: [
      { categoryId: category.id },
      { categories: { some: { categoryId: category.id } } },
    ],
  })

  const [products, total, priorityPlanIds] = await Promise.all([
    prisma.product.findMany({
      where,
      select: categoryProductSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: safePageSize,
    }),
    prisma.product.count({ where }),
    getPriorityPlacementPlanIds(),
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
      priorityPlanIds,
      placementNow: now,
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
}

export async function getCategoryProductsPage(params: {
  slug: string
  page?: number
  pageSize?: number
}): Promise<CategoryProductsPageResult> {
  "use server"

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
