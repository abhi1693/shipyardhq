import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { resolveVoteState } from "@/lib/server/productVotesStore"
import { safelyReadStaticParams } from "@/lib/staticParams"
import { getSponsoredPlacementPlanIds } from "@/lib/products/priority-plans"
import { HOMEPAGE_INITIAL_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import {
  buildPublicDiscoveryProductWhere,
  buildPublicDiscoverySqlFilter,
} from "@/lib/products/public-discovery"
import { getCurrentLeaderboardRun } from "@/lib/server/leaderboard/v2"

const publicProductSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  websiteUrl: true,
  logo: true,
  bannerImage: true,
  pricingModel: true,
  startingPriceCents: true,
  currencyCode: true,
  platforms: true,
  status: true,
  type: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  category: {
    include: {
      useCases: {
        include: {
          useCase: {
            select: {
              slug: true,
              label: true,
            },
          },
        },
      },
    },
  },
  alternatives: {
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      websiteUrl: true,
      logoUrl: true,
    },
  },
  user: {
    select: {
      id: true,
      clerkId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  metadata: {
    select: {
      videoUrl: true,
      utmCampaign: true,
    },
  },
  analytics: {
    select: {
      upvotes: true,
    },
  },
  _count: {
    select: {
      ProductUpvote: true,
    },
  },
  verification: {
    select: {
      isVerified: true,
      verifiedAt: true,
    },
  },
  ProductMedia: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      imageUrl: true,
      altText: true,
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  leaderboardScores: {
    orderBy: {
      run: {
        periodEnd: "desc",
      },
    },
    take: 6,
    select: {
      rank: true,
      score: true,
      views: true,
      uniqueVisitors: true,
      upvotes: true,
      run: {
        select: {
          periodStart: true,
          periodEnd: true,
          status: true,
        },
      },
    },
  },
  plan: {
    select: {
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

type PublicProduct = Prisma.ProductGetPayload<{
  select: typeof publicProductSelect
}>

const publicProductMetaSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  publishedAt: true,
  createdAt: true,
  logo: true,
  bannerImage: true,
  keywords: true,
  status: true,
  type: true,
  pricingModel: true,
  platforms: true,
  websiteUrl: true,
  verification: {
    select: {
      isVerified: true,
    },
  },
  category: { select: { name: true, slug: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
  analytics: { select: { upvotes: true } },
  metadata: { select: { videoUrl: true, utmCampaign: true } },
  ProductMedia: {
    select: {
      id: true,
      imageUrl: true,
      altText: true,
    },
    orderBy: { createdAt: "asc" },
  },
  plan: {
    select: {
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

async function fetchPublicProduct(where: Prisma.ProductWhereUniqueInput) {
  const product = await prisma.product.findUnique({
    where,
    select: publicProductSelect,
  })

  if (!product || product.status !== "published") return null

  const fullProduct = product as PublicProduct

  const activeBadges = fullProduct.ProductBadge.filter(
    (badge: PublicProduct["ProductBadge"][number]) =>
      !badge.expiresAt || badge.expiresAt > new Date(),
  ).map((badge) => badge.badge)

  return {
    ...fullProduct,
    badges: activeBadges,
  }
}

export async function getPublicProductBySlug(slug: string) {
  "use cache"
  applyCache([TAGS.products, TAGS.product(String(slug))], DEFAULT_TTL.medium)

  return fetchPublicProduct({ slug })
}

export async function getPublicProductMetaBySlug(slug: string) {
  "use cache"
  applyCache([TAGS.products, TAGS.product(String(slug))], 600)

  const product = await prisma.product.findUnique({
    where: { slug },
    select: publicProductMetaSelect,
  })

  if (!product || product.status !== "published") return null

  return product
}

const MAX_PRODUCT_STATIC_PARAMS_LIMIT = 1000
const DEFAULT_PRODUCT_STATIC_PARAMS_LIMIT = MAX_PRODUCT_STATIC_PARAMS_LIMIT
const HOMEPAGE_PRODUCT_STATIC_PARAMS_SPONSORED_LIMIT = 12

function normalizeProductStaticParamsLimit() {
  const raw = process.env.PRODUCT_PRERENDER_LIMIT
  if (!raw) return DEFAULT_PRODUCT_STATIC_PARAMS_LIMIT

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_PRODUCT_STATIC_PARAMS_LIMIT

  return Math.max(
    0,
    Math.min(Math.trunc(parsed), MAX_PRODUCT_STATIC_PARAMS_LIMIT),
  )
}

function startOfUtcDayDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addUtcDaysDate(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

function buildReleaseWindowWhere({
  gte,
  lt,
}: {
  gte: Date
  lt: Date
}): Prisma.ProductWhereInput {
  return {
    OR: [
      { publishedAt: { gte, lt } },
      {
        publishedAt: null,
        createdAt: { gte, lt },
      },
    ],
  }
}

function buildHomepageSponsoredWhere(
  now: Date,
  sponsoredPlanIds: readonly string[],
): Prisma.ProductWhereInput {
  const planWhere: Prisma.ProductWhereInput[] = sponsoredPlanIds.length
    ? [{ planId: { in: [...sponsoredPlanIds] } }]
    : []

  return {
    OR: [
      ...planWhere,
      {
        ProductBadge: {
          some: {
            badge: "editor-pick",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
    ],
  }
}

const homepageProductStaticParamsOrderBy = [
  { publishedAt: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
  { analytics: { upvotes: "desc" } },
] satisfies Prisma.ProductOrderByWithRelationInput[]

const launchProductStaticParamsOrderBy = [
  { analytics: { upvotes: "desc" } },
  { publishedAt: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
] satisfies Prisma.ProductOrderByWithRelationInput[]

function appendUniqueSlugs(
  target: string[],
  seen: Set<string>,
  slugs: Iterable<string | null | undefined>,
) {
  for (const slug of slugs) {
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    target.push(slug)
  }
}

async function getHomepageOrganicStaticSlugs({
  now,
  sponsoredPlanIds,
}: {
  now: Date
  sponsoredPlanIds: readonly string[]
}) {
  const startToday = startOfUtcDayDate(now)
  const startTomorrow = addUtcDaysDate(startToday, 1)
  const startYesterday = addUtcDaysDate(startToday, -1)
  const startThisWeek = addUtcDaysDate(startToday, -7)
  const sponsoredWhere = buildHomepageSponsoredWhere(now, sponsoredPlanIds)
  const organicBaseWhere: Prisma.ProductWhereInput = {
    AND: [buildPublicDiscoveryProductWhere(), { NOT: sponsoredWhere }],
  }
  const releaseWindows = [
    { gte: startToday, lt: startTomorrow },
    { gte: startYesterday, lt: startToday },
    { gte: startThisWeek, lt: startYesterday },
  ]
  const slugs: string[] = []
  const seen = new Set<string>()

  for (const releaseWindow of releaseWindows) {
    const remaining = HOMEPAGE_INITIAL_FEED_PAGE_SIZE - slugs.length
    if (remaining <= 0) break

    const products = await prisma.product.findMany({
      where: {
        AND: [organicBaseWhere, buildReleaseWindowWhere(releaseWindow)],
      },
      orderBy: homepageProductStaticParamsOrderBy,
      take: remaining,
      select: { slug: true },
    })

    appendUniqueSlugs(
      slugs,
      seen,
      products.map((product) => product.slug),
    )
  }

  return slugs
}

async function getHomepageSponsoredStaticSlugs({
  now,
  sponsoredPlanIds,
}: {
  now: Date
  sponsoredPlanIds: readonly string[]
}) {
  const products = await prisma.product.findMany({
    where: {
      AND: [
        buildPublicDiscoveryProductWhere(),
        buildHomepageSponsoredWhere(now, sponsoredPlanIds),
      ],
    },
    orderBy: homepageProductStaticParamsOrderBy,
    take: HOMEPAGE_PRODUCT_STATIC_PARAMS_SPONSORED_LIMIT,
    select: { slug: true },
  })

  return products.map((product) => product.slug)
}

async function getHomepageLaunchStaticSlugs(now: Date) {
  const startToday = startOfUtcDayDate(now)
  const startTomorrow = addUtcDaysDate(startToday, 1)
  const launchedTodayWhere = buildReleaseWindowWhere({
    gte: startToday,
    lt: startTomorrow,
  })
  const baseWhere = buildPublicDiscoveryProductWhere()
  const run = await getCurrentLeaderboardRun(now)
  const slugs: string[] = []
  const seen = new Set<string>()

  const todayTopScore = run
    ? await prisma.productLeaderboardScore.findFirst({
        where: {
          runId: run.id,
          product: {
            AND: [baseWhere, launchedTodayWhere],
          },
        },
        orderBy: [
          { score: "desc" },
          { upvotes: "desc" },
          { uniqueVisitors: "desc" },
          { views: "desc" },
        ],
        select: {
          product: { select: { slug: true } },
        },
      })
    : null

  const fallbackTopScore =
    run && !todayTopScore
      ? await prisma.productLeaderboardScore.findFirst({
          where: {
            runId: run.id,
            product: baseWhere,
          },
          orderBy: [
            { score: "desc" },
            { upvotes: "desc" },
            { uniqueVisitors: "desc" },
            { views: "desc" },
          ],
          select: {
            product: { select: { slug: true } },
          },
        })
      : null

  const todayFallbackProduct =
    todayTopScore || fallbackTopScore
      ? null
      : await prisma.product.findFirst({
          where: {
            AND: [baseWhere, launchedTodayWhere],
          },
          orderBy: launchProductStaticParamsOrderBy,
          select: { slug: true },
        })

  const fallbackProduct =
    todayTopScore || fallbackTopScore || todayFallbackProduct
      ? null
      : await prisma.product.findFirst({
          where: baseWhere,
          orderBy: launchProductStaticParamsOrderBy,
          select: { slug: true },
        })

  appendUniqueSlugs(slugs, seen, [
    todayTopScore?.product.slug,
    fallbackTopScore?.product.slug,
    todayFallbackProduct?.slug,
    fallbackProduct?.slug,
  ])

  return slugs
}

async function getHomepageProductStaticSlugs() {
  const now = new Date()
  const sponsoredPlanIds = await getSponsoredPlacementPlanIds()
  const [launchSlugs, organicSlugs, sponsoredSlugs] = await Promise.all([
    getHomepageLaunchStaticSlugs(now),
    getHomepageOrganicStaticSlugs({ now, sponsoredPlanIds }),
    getHomepageSponsoredStaticSlugs({ now, sponsoredPlanIds }),
  ])

  const slugs: string[] = []
  const seen = new Set<string>()
  appendUniqueSlugs(slugs, seen, launchSlugs)
  appendUniqueSlugs(slugs, seen, organicSlugs)
  appendUniqueSlugs(slugs, seen, sponsoredSlugs)

  return slugs
}

export async function getProductStaticParams() {
  "use cache"
  applyCache([TAGS.products, TAGS.analytics], DEFAULT_TTL.slowest)

  return safelyReadStaticParams("product pages", async () => {
    const limit = normalizeProductStaticParamsLimit()
    if (limit === 0) return []

    const homepageSlugs = await getHomepageProductStaticSlugs()
    const slugs: string[] = []
    const seen = new Set<string>()
    appendUniqueSlugs(slugs, seen, homepageSlugs)

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const trafficLimit = Math.max(0, limit - slugs.length)
    const trafficRows =
      trafficLimit > 0
        ? await prisma.productTrafficDaily.groupBy({
            by: ["productId"],
            where: {
              date: { gte: since },
              product: buildPublicDiscoveryProductWhere(),
            },
            _sum: {
              pageViews: true,
              uniqueVisitors: true,
            },
            orderBy: [
              { _sum: { pageViews: "desc" } },
              { _sum: { uniqueVisitors: "desc" } },
            ],
            take: trafficLimit,
          })
        : []

    const trafficProductIds = trafficRows.map((row) => row.productId)
    const trafficProducts = trafficProductIds.length
      ? await prisma.product.findMany({
          where: {
            id: { in: trafficProductIds },
            ...buildPublicDiscoveryProductWhere(),
          },
          select: { id: true, slug: true },
        })
      : []

    const slugById = new Map(
      trafficProducts.map((product) => [product.id, product.slug]),
    )
    for (const id of trafficProductIds) {
      const slug = slugById.get(id)
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      slugs.push(slug)
    }

    const remaining = Math.max(0, limit - slugs.length)
    if (remaining > 0) {
      const fallbackProducts = await prisma.product.findMany({
        where: buildPublicDiscoveryProductWhere({
          ...(seen.size ? { slug: { notIn: Array.from(seen) } } : {}),
        }),
        orderBy: [
          { analytics: { upvotes: "desc" } },
          { publishedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: remaining,
        select: { slug: true },
      })

      for (const product of fallbackProducts) {
        if (seen.has(product.slug)) continue
        seen.add(product.slug)
        slugs.push(product.slug)
      }
    }

    return slugs.map((slug) => ({ slug }))
  })
}

const compactProductInclude = {
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
  verification: {
    select: {
      isVerified: true,
    },
  },
} satisfies Prisma.ProductInclude

type CompactProduct = Prisma.ProductGetPayload<{
  include: typeof compactProductInclude
}>

export async function getPublicProductsByUseCase(
  useCaseSlug: string,
  excludeId: string,
  limit = 6,
): Promise<CompactProduct[]> {
  "use cache"
  applyCache(
    [TAGS.products, TAGS.category(String(useCaseSlug))],
    DEFAULT_TTL.medium,
  )

  const effectiveLimit = Math.max(1, Math.min(limit, 12))

  const randomProductIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Product" AS p
      INNER JOIN "ProductCategory" AS pc ON pc."productId" = p.id
      INNER JOIN "UseCaseCategory" AS uc ON uc."categoryId" = pc."categoryId"
      INNER JOIN "UseCase" AS u ON u.id = uc."useCaseId"
      WHERE u.slug = ${useCaseSlug}
        AND p.status = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND p.id <> ${excludeId}
      ORDER BY RANDOM()
      LIMIT ${effectiveLimit}
    `

  if (!randomProductIds.length) {
    return []
  }

  return prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere({
      id: {
        in: randomProductIds.map(({ id }: { id: string }) => id),
      },
    }),
    include: compactProductInclude,
  })
}

export async function getPublicProductsByCategory(
  categorySlug: string,
  excludeId: string,
  limit = 6,
): Promise<CompactProduct[]> {
  "use cache"
  applyCache(
    [TAGS.products, TAGS.category(String(categorySlug))],
    DEFAULT_TTL.medium,
  )

  const effectiveLimit = Math.max(1, Math.min(limit, 12))

  const randomProductIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM (
        SELECT DISTINCT p.id
        FROM "Product" AS p
        LEFT JOIN "Category" AS primary_category
          ON primary_category.id = p."categoryId"
        LEFT JOIN "ProductCategory" AS pc
          ON pc."productId" = p.id
        LEFT JOIN "Category" AS assigned_category
          ON assigned_category.id = pc."categoryId"
        WHERE (
            primary_category.slug = ${categorySlug}
            OR assigned_category.slug = ${categorySlug}
          )
          AND p.status = 'published'
          ${buildPublicDiscoverySqlFilter("p")}
          AND p.id <> ${excludeId}
      ) AS candidates
      ORDER BY RANDOM()
      LIMIT ${effectiveLimit}
    `

  if (!randomProductIds.length) {
    return []
  }

  return prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere({
      id: {
        in: randomProductIds.map(({ id }: { id: string }) => id),
      },
    }),
    include: compactProductInclude,
  })
}

export async function hasUserUpvoted(productId: string, clerkId: string) {
  const user = await getActiveUserByClerkId(clerkId)
  if (!user) return false
  const { currentState } = await resolveVoteState(productId, user.id)
  return currentState === "upvoted"
}
