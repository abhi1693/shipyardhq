import prisma from "@/lib/prisma"
import { connection } from "next/server"
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
import { hasEditorPickBadge } from "@/lib/products/badges"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"

const publishedProductWhere: Prisma.ProductWhereInput =
  buildPublicDiscoveryProductWhere()

const PROFILE_PRODUCTS_PAGE_SIZE = 60
const USER_PRODUCTS_PAGE_SIZE = 20
const USER_PRODUCTS_MAX_PAGE_SIZE = 50
const USERS_PAGE_SIZE = 20

type PublicUserListItem = {
  id: string
  firstName: string | null
  lastName: string | null
  clerkId: string | null
  _count: { products: number }
  avatarUrl: string | null
}

export type HomepageBuilderSummary = {
  builderCount: number
  topFounder: {
    id: string
    name: string
    avatarUrl: string | null
    productCount: number
    topProductName: string | null
    topProductSlug: string | null
  } | null
}

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
} as const

const publicUserProductsSelect = {
  where: publishedProductWhere,
  orderBy: { createdAt: "desc" as const },
  select: publicUserProductSelectFields,
} satisfies Prisma.User$productsArgs

type PublicUserProfileSelect = {
  id: true
  clerkId: true
  firstName: true
  lastName: true
  _count: {
    select: {
      products: { where: typeof publishedProductWhere }
    }
  }
  products: typeof publicUserProductsSelect
}

type PublicUserProfile = Prisma.UserGetPayload<{
  select: PublicUserProfileSelect
}>

const publicUserProfileSelect: PublicUserProfileSelect = {
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
}

async function getUserProductsWithPaging(
  userId: string,
  page: number = 1,
  pageSize: number = USER_PRODUCTS_PAGE_SIZE,
): Promise<UserProductsPageResult> {
  "use cache"
  applyCache([TAGS.users, TAGS.products, TAGS.user(userId)], DEFAULT_TTL.medium)

  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, USER_PRODUCTS_PAGE_SIZE)
  const skip = (safePage - 1) * safePageSize
  const where: Prisma.ProductWhereInput = buildPublicDiscoveryProductWhere({
    userId,
  })

  const [products, total, priorityPlanIds] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: safePageSize,
    }),
    prisma.product.count({ where }),
    getPriorityPlacementPlanIds(),
  ])

  const typedProducts = products as ProductCardRecord[]
  const productIds = typedProducts.map((product) => product.id)
  const scoreMap = productIds.length
    ? await getCurrentScoreMap(productIds)
    : new Map<string, number>()

  const now = new Date()
  const baseProducts = typedProducts.map((product) =>
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

  const items = baseProducts.map((product) =>
    mapUserProductToFeedItem(product, interestMap),
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
}

export async function getUserProductsPage(params: {
  userId: string
  page?: number
  pageSize?: number
}): Promise<UserProductsPageResult> {
  "use server"

  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(
    params.pageSize,
    USER_PRODUCTS_PAGE_SIZE,
  )

  return getUserProductsWithPaging(params.userId, safePage, safePageSize)
}

async function getPublicUsersPageCached(
  page: number = 1,
  pageSize: number = USERS_PAGE_SIZE,
): Promise<PublicUsersPageResult> {
  "use cache"
  applyCache([TAGS.users, TAGS.products], DEFAULT_TTL.slow)

  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, USERS_PAGE_SIZE)
  const skip = (safePage - 1) * safePageSize

  const where: Prisma.UserWhereInput = {
    products: { some: publishedProductWhere },
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
      },
      orderBy: { products: { _count: "desc" } },
      skip,
      take: safePageSize,
    }),
    prisma.user.count({ where }),
  ])

  const items = await Promise.all(
    users.map((user) => mapUserSummaryToListItem(user)),
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
}

export async function getPublicUsersPage(
  params: {
    page?: number
    pageSize?: number
  } = {},
): Promise<PublicUsersPageResult> {
  "use server"

  const safePage = normalizePage(params.page, 1)
  const safePageSize = normalizePageSize(params.pageSize, USERS_PAGE_SIZE)

  const page = await getPublicUsersPageCached(safePage, safePageSize)
  await connection()
  return withUserAvatarUrls(page)
}

type HomepageBuilderSummaryRecord = Omit<
  HomepageBuilderSummary,
  "topFounder"
> & {
  topFounder:
    | (NonNullable<HomepageBuilderSummary["topFounder"]> & {
        clerkId: string | null
      })
    | null
}

export async function getHomepageBuilderSummaryPublic(): Promise<HomepageBuilderSummary> {
  const summary = await getHomepageBuilderSummaryRecord()
  if (!summary.topFounder) {
    return summary
  }

  const { clerkId: _clerkId, ...topFounder } = summary.topFounder
  void _clerkId

  return {
    ...summary,
    topFounder,
  }
}

async function getHomepageBuilderSummaryRecord(): Promise<HomepageBuilderSummaryRecord> {
  "use cache"
  applyCache([TAGS.homepage, TAGS.users, TAGS.products], DEFAULT_TTL.slow)

  const where: Prisma.UserWhereInput = {
    status: "active",
    products: { some: publishedProductWhere },
  }

  const [builderCount, topFounder] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findFirst({
      where,
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
          where: publishedProductWhere,
          select: {
            name: true,
            slug: true,
            analytics: {
              select: {
                upvotes: true,
              },
            },
            createdAt: true,
          },
          orderBy: [{ analytics: { upvotes: "desc" } }, { createdAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [{ products: { _count: "desc" } }, { createdAt: "asc" }],
    }),
  ])

  if (!topFounder) {
    return {
      builderCount,
      topFounder: null,
    }
  }

  const name = [topFounder.firstName, topFounder.lastName]
    .map((segment) => segment?.trim())
    .filter(Boolean)
    .join(" ")

  const topProduct = topFounder.products[0] ?? null

  return {
    builderCount,
    topFounder: {
      id: topFounder.id,
      clerkId: topFounder.clerkId,
      name: name || "Shipyard maker",
      avatarUrl: null,
      productCount: topFounder._count.products,
      topProductName: topProduct?.name ?? null,
      topProductSlug: topProduct?.slug ?? null,
    },
  }
}

export async function getHomepageBuilderSummary(): Promise<HomepageBuilderSummary> {
  const summary = await getHomepageBuilderSummaryRecord()
  if (!summary.topFounder?.clerkId) {
    return summary
  }

  try {
    const clerkUser = await getClerkUserByIdCached(summary.topFounder.clerkId)
    return {
      ...summary,
      topFounder: {
        ...summary.topFounder,
        avatarUrl: clerkUser.imageUrl ?? null,
      },
    }
  } catch {
    return summary
  }
}

const mapUserProductToFeedItem = (
  product: ReturnType<typeof mapProductCardRecordToBase>,
  interestByProductId?: Map<string, ProductInterestSignals>,
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

  const badges = product.badges ?? []
  const isEditorPick = hasEditorPickBadge(badges)
  const isPriorityPlacement = Boolean((product as any).sponsored)
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
    updatedAt: coerceDateString(
      (product as any).updatedAt ?? product.createdAt,
    ),
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

const mapUserSummaryToListItem = async (user: {
  id: string
  firstName: string | null
  lastName: string | null
  clerkId: string | null
  _count: { products: number }
}): Promise<PublicUserListItem> => {
  return {
    ...user,
    avatarUrl: null,
  }
}

async function withUserAvatarUrls(
  page: PublicUsersPageResult,
): Promise<PublicUsersPageResult> {
  const items = await Promise.all(
    page.items.map(async (user) => {
      if (!user.clerkId) {
        return user
      }

      let avatarUrl: string | null = null
      try {
        const clerkUser = await getClerkUserByIdCached(user.clerkId)
        avatarUrl = clerkUser.imageUrl ?? null
      } catch {
        avatarUrl = null
      }

      return {
        ...user,
        avatarUrl,
      }
    }),
  )

  return {
    ...page,
    items,
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

export type PublicUsersPageResult = {
  items: PublicUserListItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

export async function getPublicUsersWithCounts(limit = 48) {
  "use cache"
  applyCache([TAGS.users, TAGS.products], DEFAULT_TTL.slow)

  return prisma.user.findMany({
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
  })
}

export async function getPublicUserMeta(id: string) {
  "use cache"
  applyCache([TAGS.users, TAGS.user(String(id))], DEFAULT_TTL.medium)

  return prisma.user.findUnique({
    where: { id },
    select: {
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
  })
}

export async function getPublicUserProfile(
  id: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<PublicUserProfile | null> {
  "use cache"
  applyCache(
    [TAGS.users, TAGS.products, TAGS.user(String(id))],
    DEFAULT_TTL.medium,
  )

  const pageSize = Math.max(
    1,
    Math.min(options.pageSize ?? PROFILE_PRODUCTS_PAGE_SIZE, 200),
  )
  const page = Math.max(options.page ?? 1, 1)
  const skip = (page - 1) * pageSize

  const select: Prisma.UserSelect = {
    ...publicUserProfileSelect,
    products: {
      ...publicUserProductsSelect,
      skip,
      take: pageSize,
      select: {
        ...publicUserProductSelectFields,
        ProductBadge: {
          ...publicUserProductSelectFields.ProductBadge,
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
      },
    },
  }

  return prisma.user.findUnique({
    where: { id },
    select,
  }) as Promise<PublicUserProfile | null>
}
