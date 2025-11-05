"use server"

import { unstable_cache } from "next/cache"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import {
  DEFAULT_HOMEPAGE_FEED_VIEW,
  type HomepageFeedView,
  normalizeHomepageFeedView,
} from "@/lib/homepage/feed-views"
import type { ProductCardVariant } from "@/types/product-card"
const PRIORITY_FEATURE_KEY = "priorityPlacement"

const homepageFeedSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  createdAt: true,
  updatedAt: true,
  analytics: {
    select: {
      upvotes: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  plan: {
    select: {
      price: true,
      assignments: {
        where: { enabled: true },
        select: {
          feature: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

type HomepageFeedProduct = Prisma.ProductGetPayload<{
  select: typeof homepageFeedSelect
}>

export interface HomepageFeedItem {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  createdAt: string
  updatedAt: string
  badges: string[]
  category: string | null
  categorySlug: string | null
  voteCount: number
  updatesCount?: number
  isSponsored: boolean
  isVoted: boolean
  variant?: ProductCardVariant
  shuffleRank: number
}

export interface HomepageFeedPageResult {
  items: HomepageFeedItem[]
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}

interface GetHomepageFeedPageParams {
  page?: number
  pageSize?: number
  clerkUserId?: string | null
}

interface GetHomepageFeedViewParams extends GetHomepageFeedPageParams {
  view?: HomepageFeedView
}

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed <= 0) return fallback
  return Math.floor(parsed)
}

function normalizePageSize(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed <= 0) return fallback
  const clamped = Math.min(Math.floor(parsed), 50)
  return clamped > 0 ? clamped : fallback
}

function buildBaseWhere(): Prisma.ProductWhereInput {
  return {
    status: "published",
  }
}

function mapProductToFeedItem(
  product: HomepageFeedProduct,
  upvoted: Set<string>,
  now: Date,
): HomepageFeedItem {
  const activeBadges =
    product.ProductBadge?.filter(
      (badge) => !badge.expiresAt || badge.expiresAt > now,
    ).map((badge) => badge.badge) ?? []

  const isSponsored =
    product.plan?.assignments?.some(
      (assignment) => assignment.feature?.key === PRIORITY_FEATURE_KEY,
    ) ?? false

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    badges: activeBadges,
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    voteCount: product.analytics?.upvotes ?? 0,
    isSponsored,
    isVoted: upvoted.has(product.id),
    variant: isSponsored ? "sponsored" : "default",
    shuffleRank: Math.random(),
  }
}

async function resolveUpvotedProductIds(
  clerkUserId: string | null | undefined,
  productIds: string[],
): Promise<Set<string>> {
  if (!productIds.length || !clerkUserId) {
    return new Set<string>()
  }

  const activeUser = await getActiveUserByClerkId(clerkUserId)
  if (!activeUser) {
    return new Set<string>()
  }

  const votes = await prisma.productUpvote.findMany({
    where: {
      userId: activeUser.id,
      productId: { in: productIds },
    },
    select: {
      productId: true,
    },
  })

  return new Set(votes.map((vote) => vote.productId))
}

async function buildFeedItemsFromProducts(
  products: HomepageFeedProduct[],
  clerkUserId: string | null | undefined,
): Promise<HomepageFeedItem[]> {
  if (products.length === 0) {
    return []
  }

  const productIds = products.map((product) => product.id)
  const upvoted = await resolveUpvotedProductIds(clerkUserId, productIds)
  const now = new Date()

  return products.map((product) => mapProductToFeedItem(product, upvoted, now))
}

interface GetOrderedHomepageFeedParams extends GetHomepageFeedPageParams {
  orderBy: Prisma.ProductOrderByWithRelationInput[]
  where?: Prisma.ProductWhereInput
}

async function getOrderedHomepageFeedPage({
  orderBy,
  where,
  page = 1,
  pageSize = HOMEPAGE_FEED_PAGE_SIZE,
  clerkUserId,
}: GetOrderedHomepageFeedParams): Promise<HomepageFeedPageResult> {
  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, HOMEPAGE_FEED_PAGE_SIZE)
  const skip = (safePage - 1) * safePageSize

  const baseWhere = buildBaseWhere()
  const combinedWhere =
    where && Object.keys(where).length > 0
      ? { AND: [baseWhere, where] }
      : baseWhere

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: combinedWhere,
      orderBy,
      skip,
      take: safePageSize,
      select: homepageFeedSelect,
    }),
    prisma.product.count({ where: combinedWhere }),
  ])

  const items = await buildFeedItemsFromProducts(products, clerkUserId)
  const hasMore = skip + products.length < total

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
  }
}

export async function getHomepageNewFeedPage(
  params: GetHomepageFeedPageParams = {},
): Promise<HomepageFeedPageResult> {
  const { page, pageSize, clerkUserId } = params
  return getOrderedHomepageFeedPage({
    page,
    pageSize,
    clerkUserId,
    orderBy: [{ createdAt: "desc" }, { analytics: { upvotes: "desc" } }],
  })
}

async function getHomepageFeedViewImpl(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  const { view, ...rest } = params
  const baseParams: GetHomepageFeedPageParams = rest

  normalizeHomepageFeedView(view, DEFAULT_HOMEPAGE_FEED_VIEW)
  return getHomepageNewFeedPage(baseParams)
}

export const getHomepageFeedView = unstable_cache(
  getHomepageFeedViewImpl,
  ["homepage-feed-view"],
  { revalidate: 60, tags: ["homepage-feed"] },
)

export async function getHomepageFeedViewAll(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedItem[]> {
  const items: HomepageFeedItem[] = []
  const baseParams = { ...params }
  let page = normalizePage(params.page, 1)
  let iterations = 0
  const MAX_PAGES = 100

  while (iterations < MAX_PAGES) {
    const result = await getHomepageFeedView({
      ...baseParams,
      page,
    })

    items.push(...result.items)
    iterations += 1

    if (!result.hasMore || !result.nextPage) {
      break
    }

    if (result.nextPage === page) {
      break
    }

    page = result.nextPage
  }

  return items
}
