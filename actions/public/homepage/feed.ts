"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
const PRIORITY_FEATURE_KEY = "priorityPlacement"

const homepageFeedSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  createdAt: true,
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
  badges: string[]
  category: string | null
  categorySlug: string | null
  voteCount: number
  updatesCount?: number
  isSponsored: boolean
  isVoted: boolean
}

interface GetHomepageFeedPageParams {
  page?: number
  pageSize?: number
  clerkUserId?: string | null
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

function buildPriorityWhere(): Prisma.ProductWhereInput {
  return {
    ...buildBaseWhere(),
    plan: {
      is: {
        assignments: {
          some: {
            enabled: true,
            feature: {
              is: { key: PRIORITY_FEATURE_KEY },
            },
          },
        },
      },
    },
  }
}

function buildRegularWhere(): Prisma.ProductWhereInput {
  const base = buildBaseWhere()

  const planExclusionWhere: Prisma.ProductWhereInput = {
    OR: [
      { plan: null },
      {
        plan: {
          is: {
            assignments: {
              none: {
                enabled: true,
                feature: {
                  is: { key: PRIORITY_FEATURE_KEY },
                },
              },
            },
          },
        },
      },
    ],
  }

  return {
    AND: [base, planExclusionWhere],
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
    badges: activeBadges,
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    voteCount: product.analytics?.upvotes ?? 0,
    isSponsored,
    isVoted: upvoted.has(product.id),
  }
}

export async function getHomepageFeedPage({
  page = 1,
  pageSize = HOMEPAGE_FEED_PAGE_SIZE,
  clerkUserId,
}: GetHomepageFeedPageParams = {}): Promise<{
  items: HomepageFeedItem[]
  page: number
  pageSize: number
  hasMore: boolean
  nextPage: number | null
}> {
  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, HOMEPAGE_FEED_PAGE_SIZE)
  const skip = (safePage - 1) * safePageSize

  const priorityWhere = buildPriorityWhere()
  const regularWhere = buildRegularWhere()

  const [priorityCount, regularCount] = await Promise.all([
    prisma.product.count({ where: priorityWhere }),
    prisma.product.count({ where: regularWhere }),
  ])
  const total = priorityCount + regularCount

  let prioritySkip = 0
  let priorityTake = 0
  let regularSkip = 0
  let regularTake = 0

  if (skip < priorityCount) {
    prioritySkip = skip
    priorityTake = Math.min(safePageSize, priorityCount - prioritySkip)
    regularSkip = 0
    regularTake = Math.max(0, safePageSize - priorityTake)
  } else {
    prioritySkip = priorityCount
    priorityTake = 0
    regularSkip = skip - priorityCount
    regularTake = safePageSize
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { analytics: { upvotes: "desc" } },
    { createdAt: "desc" },
  ]

  const [priorityProducts, regularProducts] = await Promise.all([
    priorityTake
      ? prisma.product.findMany({
          where: priorityWhere,
          orderBy,
          skip: prioritySkip,
          take: priorityTake,
          select: homepageFeedSelect,
        })
      : Promise.resolve([] as HomepageFeedProduct[]),
    regularTake
      ? prisma.product.findMany({
          where: regularWhere,
          orderBy,
          skip: regularSkip,
          take: regularTake,
          select: homepageFeedSelect,
        })
      : Promise.resolve([] as HomepageFeedProduct[]),
  ])

  const combined = [...priorityProducts, ...regularProducts]
  const productIds = combined.map((product) => product.id)

  let upvoted = new Set<string>()
  if (productIds.length > 0 && clerkUserId) {
    const activeUser = await getActiveUserByClerkId(clerkUserId)
    if (activeUser) {
      const votes = await prisma.productUpvote.findMany({
        where: {
          userId: activeUser.id,
          productId: { in: productIds },
        },
        select: {
          productId: true,
        },
      })
      upvoted = new Set(votes.map((vote) => vote.productId))
    }
  }

  const now = new Date()
  const items = combined.map((product) =>
    mapProductToFeedItem(product, upvoted, now),
  )
  const hasMore = skip + combined.length < total

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
  }
}

export async function loadHomepageFeed(params: { page: number }) {
  const { userId } = await auth()
  return getHomepageFeedPage({
    page: params.page,
    clerkUserId: userId,
  })
}
