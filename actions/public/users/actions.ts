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

const publishedProductWhere: Prisma.ProductWhereInput = {
  status: "published",
}

const PROFILE_PRODUCTS_PAGE_SIZE = 60
const USER_PRODUCTS_PAGE_SIZE = 20
const USER_PRODUCTS_MAX_PAGE_SIZE = 50

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
  const clamped = Math.min(Math.floor(parsed), USER_PRODUCTS_MAX_PAGE_SIZE)
  return Math.max(1, clamped)
}

const publicUserProductSelectFields = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  publishedAt: true,
  createdAt: true,
  analytics: {
    select: {
      upvotes: true,
    },
  },
  verification: {
    select: {
      isVerified: true,
    },
  },
  category: {
    select: {
      name: true,
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  paymentConnector: {
    select: {
      latestAllTimeRevenueCents: true,
      latestCurrencyCode: true,
      verifiedAt: true,
      status: true,
      revenueHistory: {
        orderBy: { periodStart: "desc" },
        take: 1,
        select: {
          allTimeRevenueCents: true,
          currencyCode: true,
        },
      },
    },
  },
} as const

const publicUserProductsSelect = {
  where: publishedProductWhere,
  orderBy: { createdAt: "desc" as const },
  select: publicUserProductSelectFields,
} satisfies Prisma.User$productsArgs

const publicUserProfileSelect = {
  id: true,
  clerkId: true,
  firstName: true,
  lastName: true,
  _count: {
    select: {
      products: { where: publishedProductWhere },
    },
  },
  products: publicUserProductsSelect,
} satisfies Prisma.UserSelect

type PublicUserProfile = Prisma.UserGetPayload<{
  select: typeof publicUserProfileSelect
}>

const getUserProductsWithPaging = cached(
  async (
    userId: string,
    page: number = 1,
    pageSize: number = USER_PRODUCTS_PAGE_SIZE,
  ): Promise<UserProductsPageResult> => {
    const safePage = normalizePage(page, 1)
    const safePageSize = normalizePageSize(pageSize, USER_PRODUCTS_PAGE_SIZE)
    const skip = (safePage - 1) * safePageSize
    const where: Prisma.ProductWhereInput = {
      status: "published",
      userId,
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: productCardSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: safePageSize,
      }),
      prisma.product.count({ where }),
    ])

    const typedProducts = products as ProductCardRecord[]
    const productIds = typedProducts.map((product) => product.id)
    const scoreMap = productIds.length
      ? await getCurrentScoreMap(productIds)
      : new Map<string, number>()

    const now = new Date()
    const items = typedProducts.map((product) =>
      mapUserProductToFeedItem(
        mapProductCardRecordToBase(product, now, {
          scoreByProductId: scoreMap,
        }),
      ),
    )

    const hasMore = skip + items.length < total

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      hasMore,
      nextPage: hasMore ? safePage + 1 : null,
    }
  },
  "user:products:page",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([userId, page, pageSize]) => [
      userId,
      `page:${normalizePage(page, 1)}`,
      `pageSize:${normalizePageSize(pageSize, USER_PRODUCTS_PAGE_SIZE)}`,
    ],
    tags: ([userId]) => [TAGS.users, TAGS.products, TAGS.user(userId)],
  },
)

export async function getUserProductsPage(params: {
  userId: string
  page?: number
  pageSize?: number
}): Promise<UserProductsPageResult> {
  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(
    params.pageSize,
    USER_PRODUCTS_PAGE_SIZE,
  )

  return getUserProductsWithPaging(params.userId, safePage, safePageSize)
}

const mapUserProductToFeedItem = (
  product: ReturnType<typeof mapProductCardRecordToBase>,
): HomepageFeedItem => {
  const categoryName = product.category?.name ?? null
  const categorySlug = (product.category as any)?.slug ?? null
  const coerceDateString = (value: any) => {
    if (!value) return new Date().toISOString()
    if (value instanceof Date) return value.toISOString()
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString()
  }

  const isSponsored = Boolean((product as any).sponsored)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: coerceDateString(product.createdAt),
    updatedAt: coerceDateString((product as any).updatedAt ?? product.createdAt),
    badges: product.badges ?? [],
    category: categoryName,
    categorySlug,
    scoreCount:
      typeof product.scoreCount === "number" ? product.scoreCount : undefined,
    isSponsored,
    isVoted: false,
    isVerified: Boolean(product.isVerified),
    variant: isSponsored ? "sponsored" : "default",
    latestRevenueCents:
      typeof product.latestRevenueCents === "number"
        ? product.latestRevenueCents
        : null,
    revenueCurrencyCode: product.revenueCurrencyCode ?? null,
    shuffleRank: Math.random(),
  }
}

export type UserProductsPageResult = {
  items: HomepageFeedItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

export const getPublicUsersWithCounts = cached(
  async (limit = 48) =>
    prisma.user.findMany({
      where: { products: { some: publishedProductWhere } },
      select: {
        id: true,
        clerkId: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            products: {
              where: publishedProductWhere,
            },
          },
        },
      },
      orderBy: { products: { _count: "desc" } },
      take: limit,
    }),
  "users:with-product-counts",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.users, TAGS.products] },
)

export const getPublicUserMeta = cached(
  async (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        firstName: true,
        lastName: true,
      },
    }),
  "user:public-meta",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.users, TAGS.user(String(id))],
  },
)

export const getPublicUserProfile = cached(
  async (
    id: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<PublicUserProfile | null> => {
    const pageSize = Math.max(
      1,
      Math.min(options.pageSize ?? PROFILE_PRODUCTS_PAGE_SIZE, 200),
    )
    const page = Math.max(options.page ?? 1, 1)
    const skip = (page - 1) * pageSize

    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clerkId: true,
        _count: {
          select: {
            products: { where: publishedProductWhere },
          },
        },
        products: {
          ...publicUserProductsSelect,
          skip,
          take: pageSize,
          select: {
            ...publicUserProductSelectFields,
            ProductBadge: {
              ...publicUserProductSelectFields.ProductBadge,
              where: {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } },
                ],
              },
            },
          },
        },
      },
    }) as Promise<PublicUserProfile | null>
  },
  "user:public-profile",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([id, options]) => [
      String(id),
      `page:${options?.page ?? 1}`,
      `pageSize:${options?.pageSize ?? PROFILE_PRODUCTS_PAGE_SIZE}`,
    ],
    tags: ([id]) => [TAGS.users, TAGS.products, TAGS.user(String(id))],
  },
)
