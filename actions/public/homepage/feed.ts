"use server"

import { unstable_cache } from "next/cache"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import {
  convertToUsdCents,
  getUsdConversionRates,
} from "@/lib/server/payments/currency"
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
  paymentConnector: {
    select: {
      latestAllTimeRevenueCents: true,
      latestCurrencyCode: true,
      revenueHistory: {
        orderBy: { periodStart: "desc" },
        take: 1,
        select: {
          currencyCode: true,
          allTimeRevenueCents: true,
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
  latestRevenueCents?: number | null
  revenueCurrencyCode?: string | null
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

function buildVerifiedRevenueWhere(): Prisma.ProductWhereInput {
  return {
    paymentConnector: {
      is: {
        verifiedAt: { not: null },
        status: "active",
        OR: [
          { latestAllTimeRevenueCents: { gt: 0 } },
          {
            revenueHistory: {
              some: { allTimeRevenueCents: { gt: 0 } },
            },
          },
        ],
      },
    },
  }
}

function mapProductToFeedItem(
  product: HomepageFeedProduct,
  upvoted: Set<string>,
  now: Date,
  rates: Map<string, number>,
): HomepageFeedItem {
  const activeBadges =
    product.ProductBadge?.filter(
      (badge) => !badge.expiresAt || badge.expiresAt > now,
    ).map((badge) => badge.badge) ?? []

  const isSponsored =
    product.plan?.assignments?.some(
      (assignment) => assignment.feature?.key === PRIORITY_FEATURE_KEY,
    ) ?? false

  const latestRevenueCents =
    product.paymentConnector?.latestAllTimeRevenueCents ?? null
  const fallbackSnapshot = product.paymentConnector?.revenueHistory?.[0]

  const normalizedLatestRevenueCents =
    typeof latestRevenueCents === "number"
      ? latestRevenueCents
      : typeof fallbackSnapshot?.allTimeRevenueCents === "number"
        ? fallbackSnapshot.allTimeRevenueCents
        : null

  const revenueCurrencyCode =
    product.paymentConnector?.latestCurrencyCode ??
    fallbackSnapshot?.currencyCode ??
    null

  const normalizedRevenueInUsd =
    typeof normalizedLatestRevenueCents === "number"
      ? convertToUsdCents(
          normalizedLatestRevenueCents,
          revenueCurrencyCode,
          rates,
        )
          .usdCents
      : null

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
    latestRevenueCents: normalizedRevenueInUsd,
    revenueCurrencyCode: normalizedRevenueInUsd !== null ? "USD" : null,
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

  type Vote = (typeof votes)[number]
  return new Set(votes.map((vote: Vote) => vote.productId))
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
  const needsRates = products.some((product) => {
    const code =
      product.paymentConnector?.latestCurrencyCode ??
      product.paymentConnector?.revenueHistory?.[0]?.currencyCode ??
      "USD"
    return code.toUpperCase() !== "USD"
  })
  const rates = needsRates
    ? await getUsdConversionRates()
    : new Map<string, number>([["USD", 1]])

  return products.map((product) =>
    mapProductToFeedItem(product, upvoted, now, rates),
  )
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

export async function getHomepageVerifiedRevenueFeedPage(
  params: GetHomepageFeedPageParams = {},
): Promise<HomepageFeedPageResult> {
  const { page, pageSize, clerkUserId } = params
  return getOrderedHomepageFeedPage({
    page,
    pageSize,
    clerkUserId,
    where: buildVerifiedRevenueWhere(),
    orderBy: [
      { paymentConnector: { latestAllTimeRevenueCents: "desc" } },
      { analytics: { upvotes: "desc" } },
      { createdAt: "desc" },
    ],
  })
}

async function getHomepageFeedViewImpl(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  const { view, ...rest } = params
  const baseParams: GetHomepageFeedPageParams = rest
  const normalizedView = normalizeHomepageFeedView(
    view,
    DEFAULT_HOMEPAGE_FEED_VIEW,
  )

  if (normalizedView === "verified-revenue") {
    return getHomepageVerifiedRevenueFeedPage(baseParams)
  }

  return getHomepageNewFeedPage(baseParams)
}

export const getHomepageFeedView = unstable_cache(
  getHomepageFeedViewImpl,
  ["homepage-feed-view"],
  { revalidate: 300, tags: ["homepage-feed"] },
)

export async function getHomepageFeedViewAll(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedItem[]> {
  const items: HomepageFeedItem[] = []
  const normalizedView = normalizeHomepageFeedView(
    params.view,
    DEFAULT_HOMEPAGE_FEED_VIEW,
  )
  const baseParams = { ...params, view: normalizedView }
  let page = normalizePage(params.page, 1)
  let iterations = 0
  const MAX_PAGES = normalizedView === "verified-revenue" ? 1 : 100

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

  if (normalizedView === "verified-revenue") {
    items.sort((a, b) => {
      const aRevenue = a.latestRevenueCents ?? 0
      const bRevenue = b.latestRevenueCents ?? 0
      if (bRevenue !== aRevenue) {
        return bRevenue - aRevenue
      }

      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount
      }

      const aCreated = new Date(a.createdAt).getTime() || 0
      const bCreated = new Date(b.createdAt).getTime() || 0
      return bCreated - aCreated
    })
  }

  return items
}
