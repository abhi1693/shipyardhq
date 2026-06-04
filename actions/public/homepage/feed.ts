"use server"

import { unstable_cache } from "next/cache"
import prisma from "@/lib/prisma"
import { PlacementStatus, Prisma } from "@/lib/vendor/prisma/client"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"
import type { ProductCardVariant } from "@/types/product-card"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import type { ProductInterestSignals } from "@/types/product-interest"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { hasEditorPickBadge } from "@/lib/products/badges"
import { stableUnitInterval } from "@/lib/stable-random"
const PRIORITY_FEATURE_KEY = "priorityPlacement"
const SPONSORED_PLACEMENT_FEATURE_KEY = "sponsoredProducts"
const SPONSORED_PLAN_FEATURE_KEYS = [
  PRIORITY_FEATURE_KEY,
  SPONSORED_PLACEMENT_FEATURE_KEY,
] as const
const SPONSORED_PLAN_FEATURE_KEY_SET = new Set<string>(
  SPONSORED_PLAN_FEATURE_KEYS,
)
const EDITOR_PICK_BADGE = "editor-pick"
const HOMEPAGE_SPONSORED_LIMIT = 12

const homepageFeedSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  pricingModel: true,
  startingPriceCents: true,
  currencyCode: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
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
      slug: true,
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  placementSchedules: {
    where: {
      featureKey: SPONSORED_PLACEMENT_FEATURE_KEY,
      status: PlacementStatus.active,
    },
    select: {
      startsAt: true,
      endsAt: true,
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
  pricingModel?: "free" | "freemium" | "subscription" | "one_time" | "custom"
  startingPriceCents?: number | null
  currencyCode?: string | null
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
  badges: string[]
  category: string | null
  categorySlug: string | null
  scoreCount?: number
  updatesCount?: number
  isSponsored: boolean
  isVoted: boolean
  isVerified: boolean
  variant?: ProductCardVariant
  interest?: ProductInterestSignals | null
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

function buildSponsoredPlacementWhere(now: Date): Prisma.ProductWhereInput {
  return {
    OR: [
      {
        plan: {
          is: {
            assignments: {
              some: {
                enabled: true,
                feature: {
                  is: { key: { in: [...SPONSORED_PLAN_FEATURE_KEYS] } },
                },
              },
            },
          },
        },
      },
      {
        ProductBadge: {
          some: {
            badge: EDITOR_PICK_BADGE,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
      {
        placementSchedules: {
          some: {
            featureKey: SPONSORED_PLACEMENT_FEATURE_KEY,
            status: PlacementStatus.active,
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
      },
    ],
  }
}

function mapProductToFeedItem(
  product: HomepageFeedProduct,
  upvoted: Set<string>,
  now: Date,
  scoreByProductId?: Map<string, number>,
  interestByProductId?: Map<string, ProductInterestSignals>,
): HomepageFeedItem {
  const activeBadges =
    product.ProductBadge?.filter(
      (badge) => !badge.expiresAt || badge.expiresAt > now,
    ).map((badge) => badge.badge) ?? []

  const isSponsoredPlan =
    product.plan?.assignments?.some(
      (assignment) =>
        typeof assignment.feature?.key === "string" &&
        SPONSORED_PLAN_FEATURE_KEY_SET.has(assignment.feature.key),
    ) ?? false
  const hasActiveSponsoredSchedule =
    product.placementSchedules?.some(
      (schedule) => schedule.startsAt <= now && schedule.endsAt >= now,
    ) ?? false
  const isEditorPick = hasEditorPickBadge(activeBadges)
  const isSponsored =
    isSponsoredPlan || hasActiveSponsoredSchedule || isEditorPick
  const variant: ProductCardVariant =
    isSponsoredPlan || hasActiveSponsoredSchedule
      ? "sponsored"
      : isEditorPick
        ? "promoted"
        : "default"

  const scoreCount = scoreByProductId?.get(product.id)
  const shuffleKey = now.toISOString().slice(0, 10)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline ?? "",
    pricingModel: product.pricingModel,
    startingPriceCents: product.startingPriceCents,
    currencyCode: product.currencyCode,
    publishedAt: product.publishedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    badges: activeBadges,
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    scoreCount: typeof scoreCount === "number" ? scoreCount : undefined,
    isSponsored,
    isVoted: upvoted.has(product.id),
    isVerified: Boolean(product.verification?.isVerified),
    variant,
    interest: interestByProductId?.get(product.id) ?? null,
    shuffleRank: stableUnitInterval(`${shuffleKey}:${product.id}`),
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
  const scoreMap = await getCurrentScoreMap(productIds)
  const interestMap = await getProductInterestSignalsMap({
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
    })),
  })
  return products.map((product) =>
    mapProductToFeedItem(product, upvoted, now, scoreMap, interestMap),
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
  const safePage = normalizePage(page, 1)
  const now = new Date()
  const sponsoredPlacementWhere = buildSponsoredPlacementWhere(now)
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { publishedAt: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" },
    { analytics: { upvotes: "desc" } },
  ]

  const organicPage = await getOrderedHomepageFeedPage({
    page,
    pageSize,
    clerkUserId,
    where: { NOT: sponsoredPlacementWhere },
    orderBy,
  })

  if (safePage !== 1) {
    return organicPage
  }

  const sponsoredProducts = await prisma.product.findMany({
    where: {
      AND: [buildBaseWhere(), sponsoredPlacementWhere],
    },
    orderBy,
    take: HOMEPAGE_SPONSORED_LIMIT,
    select: homepageFeedSelect,
  })
  const sponsoredItems = await buildFeedItemsFromProducts(
    sponsoredProducts,
    clerkUserId,
  )

  return {
    ...organicPage,
    items: [...sponsoredItems, ...organicPage.items],
  }
}

async function getHomepageFeedViewImpl(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  return getHomepageNewFeedPage(params)
}

export const getHomepageFeedView = unstable_cache(
  getHomepageFeedViewImpl,
  ["homepage-feed-view"],
  { revalidate: 300, tags: ["homepage-feed"] },
)

export async function getHomepageFeedPage(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  return getHomepageFeedView(params)
}

export async function getHomepageFeedViewAll(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedItem[]> {
  const items: HomepageFeedItem[] = []
  let page = normalizePage(params.page, 1)
  let iterations = 0
  const MAX_PAGES = 100

  while (iterations < MAX_PAGES) {
    const result = await getHomepageFeedView({
      ...params,
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
