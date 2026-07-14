"use server"

import prisma from "@/lib/prisma"
import {
  getAnalyticsReportingWindow,
  getPreviousAnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"
import { Prisma } from "@/lib/vendor/prisma/client"
import { applyCache } from "@/lib/cache"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import {
  HOMEPAGE_FEED_PAGE_SIZE,
  HOMEPAGE_INITIAL_FEED_PAGE_SIZE,
} from "@/lib/homepage/feed-constants"
import {
  HOMEPAGE_WINDOW_PERIOD_ORDER,
  isHomepageLaunchPeriod,
  type HomepageLaunchPeriod,
} from "@/lib/homepage/launch-periods"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"
import type { ProductCardVariant } from "@/types/product-card"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import type { ProductInterestSignals } from "@/types/product-interest"
import {
  getProductInterestSignalsMap,
  type ProductRef,
} from "@/lib/server/analytics/productInterest"
import { hasEditorPickBadge } from "@/lib/products/badges"
import { stableUnitInterval } from "@/lib/stable-random"
import { getCurrentLeaderboardRun } from "@/lib/server/leaderboard/v2"
import {
  buildCacheKey,
  cacheGetOrSet,
  invalidateCacheByPrefix,
} from "@/lib/server/cache"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"
import { revalidateHomepage } from "@/lib/cache/revalidate"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  buildActivePlacementPlanFilter,
  getSponsoredPlacementPlanIds,
  hasActivePlacementGrant,
} from "@/lib/products/priority-plans"
import { PAID_PLACEMENT_GRANT_SOURCES } from "@/lib/products/placement-grants"
import {
  resolveProductCategories,
  type ProductCategorySummary,
} from "@/lib/products/categories"

const EDITOR_PICK_BADGE = "editor-pick"
const HOMEPAGE_SPONSORED_LIMIT = 12
const HOMEPAGE_SPONSORED_INTERVAL = 8
const HOMEPAGE_FEED_POOL_LIMIT = 200
const HOMEPAGE_ROTATION_SEED = "homepage-organic-rotation"
const HOMEPAGE_FEED_CACHE_VERSION = "v4"
const HOMEPAGE_FEED_POOL_CACHE_VERSION = "v5"
const HOMEPAGE_FEED_CACHE_PREFIX = buildCacheKey("homepage", "feed")
const HOMEPAGE_FEED_CACHE_TTL_SECONDS = resolveCacheTtl("slow")

const homepageFeedSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  planId: true,
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
  categories: {
    orderBy: [{ createdAt: "asc" }, { categoryId: "asc" }],
    take: 3,
    select: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  planGrants: {
    where: {
      source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
      status: "active",
    },
    select: {
      planId: true,
      source: true,
      status: true,
      startsAt: true,
      expiresAt: true,
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
  categories: ProductCategorySummary[]
  upvoteCount: number
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
  launchPeriod?: HomepageLaunchPeriod | null
}

type HomepageLaunchWindow = "all" | "week" | "homepage"
type RefreshHomepageFeedCacheOptions = {
  revalidateNextCache?: boolean
  useNextLaunchCache?: boolean
}

type FeedItemBuildContext = {
  interestByProductId?: Map<string, ProductInterestSignals>
  now: Date
  scoreByProductId?: Map<string, number>
  sponsoredPlanIds: ReadonlySet<string>
  upvoted: Set<string>
}

interface HomepageWeekFeedPools {
  generatedAt: string
  dateKey: string
  today: HomepageFeedItem[]
  yesterday: HomepageFeedItem[]
  thisWeek: HomepageFeedItem[]
  lastWeek: HomepageFeedItem[]
  thisMonth: HomepageFeedItem[]
  previousMonth: HomepageFeedItem[]
  thisYear: HomepageFeedItem[]
  sponsored: HomepageFeedItem[]
}

export type HomepageLaunchOfDay = HomepageFeedItem & {
  rank: number | null
  score: number | null
  upvoteGrowthPercent: number | null
  visitorsInWindow: number
  recommenderCount: number
  recommenderAvatarUrls: string[]
}

interface GetHomepageFeedPageParams {
  page?: number
  pageSize?: number
  clerkUserId?: string | null
  excludeProductIds?: string[]
  launchWindow?: HomepageLaunchWindow
  launchPeriod?: HomepageLaunchPeriod | null
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
  return buildPublicDiscoveryProductWhere()
}

function startOfUtcDayDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function startOfUtcWeekDate(date: Date) {
  const start = startOfUtcDayDate(date)
  const day = start.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return addUtcDaysDate(start, -daysSinceMonday)
}

function startOfUtcMonthDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function startOfPreviousUtcMonthDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))
}

function startOfUtcYearDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

function addUtcDaysDate(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

function buildHomepageLaunchPeriodDefinitions(now: Date) {
  const startToday = startOfUtcDayDate(now)
  const startTomorrow = addUtcDaysDate(startToday, 1)
  const startYesterday = addUtcDaysDate(startToday, -1)
  const startThisWeek = startOfUtcWeekDate(now)
  const startLastWeek = addUtcDaysDate(startThisWeek, -7)
  const startThisMonth = startOfUtcMonthDate(now)
  const startPreviousMonth = startOfPreviousUtcMonthDate(now)
  const startThisYear = startOfUtcYearDate(now)

  return {
    today: { gte: startToday, lt: startTomorrow },
    yesterday: { gte: startYesterday, lt: startToday },
    thisWeek: { gte: startThisWeek, lt: startYesterday },
    lastWeek: { gte: startLastWeek, lt: startThisWeek },
    thisMonth: { gte: startThisMonth, lt: startLastWeek },
    previousMonth: { gte: startPreviousMonth, lt: startThisMonth },
    thisYear: { gte: startThisYear, lt: startPreviousMonth },
  }
}

function hasValidReleaseWindow({ gte, lt }: { gte: Date; lt: Date }) {
  return gte.getTime() < lt.getTime()
}

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

function buildSponsoredPlacementWhere(
  now: Date,
  sponsoredPlanIds: readonly string[],
): Prisma.ProductWhereInput {
  const planWhere: Prisma.ProductWhereInput[] = sponsoredPlanIds.length
    ? [buildActivePlacementPlanFilter(sponsoredPlanIds, now)]
    : []

  return {
    OR: [
      ...planWhere,
      {
        ProductBadge: {
          some: {
            badge: EDITOR_PICK_BADGE,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
    ],
  }
}

function buildLaunchWindowWhere(
  launchWindow: HomepageLaunchWindow | undefined,
  now: Date,
): Prisma.ProductWhereInput | null {
  if (launchWindow !== "week") {
    return null
  }

  const startThisWeek = addUtcDaysDate(startOfUtcDayDate(now), -7)

  return {
    OR: [
      { publishedAt: { gte: startThisWeek } },
      {
        publishedAt: null,
        createdAt: { gte: startThisWeek },
      },
    ],
  }
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

function getHomepageFeedOrderBy(): Prisma.ProductOrderByWithRelationInput[] {
  return [
    { publishedAt: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" },
    { analytics: { upvotes: "desc" } },
  ]
}

function mapProductToFeedItem(
  product: HomepageFeedProduct,
  upvoted: Set<string>,
  now: Date,
  scoreByProductId?: Map<string, number>,
  interestByProductId?: Map<string, ProductInterestSignals>,
  sponsoredPlanIds: ReadonlySet<string> = new Set(),
): HomepageFeedItem {
  const activeBadges =
    product.ProductBadge?.filter(
      (badge) => !badge.expiresAt || badge.expiresAt > now,
    ).map((badge) => badge.badge) ?? []

  const isSponsoredPlan = hasActivePlacementGrant(
    product,
    sponsoredPlanIds,
    now,
  )
  const isEditorPick = hasEditorPickBadge(activeBadges)
  const variant: ProductCardVariant = isSponsoredPlan
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
    categories: resolveProductCategories(product.category, product.categories),
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount: typeof scoreCount === "number" ? scoreCount : undefined,
    isSponsored: isSponsoredPlan,
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

export async function getHomepageViewerUpvotedProductIds({
  clerkUserId,
  productIds,
}: {
  clerkUserId: string | null | undefined
  productIds: string[]
}): Promise<string[]> {
  const upvoted = await resolveUpvotedProductIds(clerkUserId, productIds)
  return Array.from(upvoted)
}

async function buildFeedItemsFromProducts(
  products: HomepageFeedProduct[],
  clerkUserId: string | null | undefined,
  sponsoredPlanIds: ReadonlySet<string>,
  now = new Date(),
): Promise<HomepageFeedItem[]> {
  if (products.length === 0) {
    return []
  }

  const context = await resolveFeedItemBuildContext(
    products,
    clerkUserId,
    sponsoredPlanIds,
    now,
  )

  return buildFeedItemsFromProductsWithContext(products, context)
}

async function resolveFeedItemBuildContext(
  products: HomepageFeedProduct[],
  clerkUserId: string | null | undefined,
  sponsoredPlanIds: ReadonlySet<string>,
  now = new Date(),
): Promise<FeedItemBuildContext> {
  const uniqueProducts = Array.from(
    products
      .reduce((map, product) => {
        map.set(product.id, {
          id: product.id,
          slug: product.slug,
        })
        return map
      }, new Map<string, ProductRef>())
      .values(),
  )
  const uniqueProductIds = uniqueProducts.map((product) => product.id)
  const [upvoted, scoreMap, interestMap] = await Promise.all([
    resolveUpvotedProductIds(clerkUserId, uniqueProductIds),
    getCurrentScoreMap(uniqueProductIds),
    getProductInterestSignalsMap({
      products: uniqueProducts,
    }),
  ])

  return {
    interestByProductId: interestMap,
    now,
    scoreByProductId: scoreMap,
    sponsoredPlanIds,
    upvoted,
  }
}

function buildFeedItemsFromProductsWithContext(
  products: HomepageFeedProduct[],
  context: FeedItemBuildContext,
): HomepageFeedItem[] {
  return products.map((product) =>
    mapProductToFeedItem(
      product,
      context.upvoted,
      context.now,
      context.scoreByProductId,
      context.interestByProductId,
      context.sponsoredPlanIds,
    ),
  )
}

async function buildFeedItemsFromProductGroups(
  productGroups: HomepageFeedProduct[][],
  clerkUserId: string | null | undefined,
  sponsoredPlanIds: ReadonlySet<string>,
  now = new Date(),
): Promise<HomepageFeedItem[][]> {
  const products = productGroups.flat()
  if (products.length === 0) {
    return productGroups.map(() => [])
  }

  const context = await resolveFeedItemBuildContext(
    products,
    clerkUserId,
    sponsoredPlanIds,
    now,
  )

  return productGroups.map((group) =>
    buildFeedItemsFromProductsWithContext(group, context),
  )
}

async function applyViewerVoteStateToGroups(
  itemGroups: HomepageFeedItem[][],
  clerkUserId: string | null | undefined,
): Promise<HomepageFeedItem[][]> {
  if (!clerkUserId) return itemGroups

  const productIds: string[] = []
  const seen = new Set<string>()
  for (const group of itemGroups) {
    for (const item of group) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      productIds.push(item.id)
    }
  }

  if (!productIds.length) return itemGroups

  const upvoted = await resolveUpvotedProductIds(clerkUserId, productIds)
  return itemGroups.map((group) =>
    group.map((item) => ({
      ...item,
      isVoted: upvoted.has(item.id),
    })),
  )
}

interface GetOrderedHomepageFeedParams extends GetHomepageFeedPageParams {
  now: Date
  orderBy: Prisma.ProductOrderByWithRelationInput[]
  where?: Prisma.ProductWhereInput
  rotate?: boolean
  sponsoredPlanIds: ReadonlySet<string>
}

function getShuffleDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function getRotatedOffset(total: number, seed: string) {
  if (total <= 0) return 0
  return Math.floor(stableUnitInterval(seed) * total)
}

function compareFeedItemsByShuffleRank(
  a: HomepageFeedItem,
  b: HomepageFeedItem,
) {
  if (a.shuffleRank !== b.shuffleRank) {
    return a.shuffleRank - b.shuffleRank
  }

  const aDate = a.publishedAt ?? a.createdAt
  const bDate = b.publishedAt ?? b.createdAt
  const dateSort = bDate.localeCompare(aDate)
  if (dateSort !== 0) return dateSort

  return a.name.localeCompare(b.name)
}

function buildHomepageWeekFeedPoolsCacheKey(date = new Date()) {
  return buildCacheKey(
    "homepage",
    "feed",
    "pools",
    HOMEPAGE_FEED_POOL_CACHE_VERSION,
    getShuffleDateKey(date),
  )
}

function getUniqueFeedItems(items: HomepageFeedItem[]) {
  const seen = new Set<string>()
  const uniqueItems: HomepageFeedItem[] = []

  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    uniqueItems.push(item)
  }

  return uniqueItems
}

function ensurePageIncludesPeriodItem(
  pageItems: HomepageFeedItem[],
  periodItems: HomepageFeedItem[],
) {
  if (periodItems.length === 0) return pageItems

  const pageIds = new Set(pageItems.map((item) => item.id))
  if (periodItems.some((item) => pageIds.has(item.id))) {
    return pageItems
  }

  const periodItem = periodItems.find((item) => !pageIds.has(item.id))
  if (!periodItem) return pageItems

  return [...pageItems, periodItem]
}

async function getHomepageWeekFeedPoolsImpl(
  now = new Date(),
): Promise<HomepageWeekFeedPools> {
  const launchPeriods = buildHomepageLaunchPeriodDefinitions(now)
  const sponsoredPlanIds = await getSponsoredPlacementPlanIds()
  const sponsoredPlanIdSet = new Set(sponsoredPlanIds)
  const sponsoredPlacementWhere = buildSponsoredPlacementWhere(
    now,
    sponsoredPlanIds,
  )
  const organicBaseWhere: Prisma.ProductWhereInput = {
    AND: [buildBaseWhere(), { NOT: sponsoredPlacementWhere }],
  }
  const orderBy = getHomepageFeedOrderBy()
  const findOrganicProductsForWindow = (window: { gte: Date; lt: Date }) => {
    if (!hasValidReleaseWindow(window)) {
      return Promise.resolve([] satisfies HomepageFeedProduct[])
    }

    return prisma.product.findMany({
      where: {
        AND: [organicBaseWhere, buildReleaseWindowWhere(window)],
      },
      orderBy,
      take: HOMEPAGE_FEED_POOL_LIMIT,
      select: homepageFeedSelect,
    })
  }

  const [
    todayProducts,
    yesterdayProducts,
    thisWeekProducts,
    lastWeekProducts,
    thisMonthProducts,
    previousMonthProducts,
    thisYearProducts,
    sponsoredProducts,
  ] = await Promise.all([
    findOrganicProductsForWindow(launchPeriods.today),
    findOrganicProductsForWindow(launchPeriods.yesterday),
    findOrganicProductsForWindow(launchPeriods.thisWeek),
    findOrganicProductsForWindow(launchPeriods.lastWeek),
    findOrganicProductsForWindow(launchPeriods.thisMonth),
    findOrganicProductsForWindow(launchPeriods.previousMonth),
    findOrganicProductsForWindow(launchPeriods.thisYear),
    prisma.product.findMany({
      where: {
        AND: [buildBaseWhere(), sponsoredPlacementWhere],
      },
      orderBy,
      take: HOMEPAGE_SPONSORED_LIMIT,
      select: homepageFeedSelect,
    }),
  ])

  const [
    today,
    yesterday,
    thisWeek,
    lastWeek,
    thisMonth,
    previousMonth,
    thisYear,
    sponsored,
  ] = await buildFeedItemsFromProductGroups(
    [
      todayProducts,
      yesterdayProducts,
      thisWeekProducts,
      lastWeekProducts,
      thisMonthProducts,
      previousMonthProducts,
      thisYearProducts,
      sponsoredProducts,
    ],
    null,
    sponsoredPlanIdSet,
    now,
  )

  return {
    generatedAt: now.toISOString(),
    dateKey: getShuffleDateKey(now),
    today: getUniqueFeedItems(today),
    yesterday: getUniqueFeedItems(yesterday),
    thisWeek: getUniqueFeedItems(thisWeek),
    lastWeek: getUniqueFeedItems(lastWeek),
    thisMonth: getUniqueFeedItems(thisMonth),
    previousMonth: getUniqueFeedItems(previousMonth),
    thisYear: getUniqueFeedItems(thisYear),
    sponsored: getUniqueFeedItems(
      sponsored.sort(compareFeedItemsByShuffleRank),
    ),
  }
}

async function getHomepageWeekFeedPools() {
  const now = new Date()
  const cacheKey = buildHomepageWeekFeedPoolsCacheKey(now)

  return cacheGetOrSet({
    key: cacheKey,
    ttlSeconds: HOMEPAGE_FEED_CACHE_TTL_SECONDS,
    loader: () => getHomepageWeekFeedPoolsImpl(now),
    onError: (error) => {
      console.error("[homepage] failed to use Redis week feed pool cache", {
        cacheKey,
        error,
      })
    },
  })
}

async function getHomepageWeekFeedPageFromPools({
  page = 1,
  pageSize = HOMEPAGE_FEED_PAGE_SIZE,
  clerkUserId,
  excludeProductIds = [],
  launchPeriod,
}: GetHomepageFeedPageParams): Promise<HomepageFeedPageResult> {
  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, HOMEPAGE_FEED_PAGE_SIZE)
  const organicStartIndex = (safePage - 1) * safePageSize
  const pools = await getHomepageWeekFeedPools()
  const excludedIds = new Set(excludeProductIds.filter(Boolean))
  const withoutExcludedItems = (items: HomepageFeedItem[]) =>
    excludedIds.size ? items.filter((item) => !excludedIds.has(item.id)) : items
  const todayItems = withoutExcludedItems(pools.today)
  const yesterdayItems = withoutExcludedItems(pools.yesterday)
  const thisWeekItems = withoutExcludedItems(pools.thisWeek)
  const lastWeekItems = withoutExcludedItems(pools.lastWeek)
  const thisMonthItems = withoutExcludedItems(pools.thisMonth)
  const previousMonthItems = withoutExcludedItems(pools.previousMonth)
  const thisYearItems = withoutExcludedItems(pools.thisYear)
  const recentThirdPeriodItems =
    [
      thisWeekItems,
      lastWeekItems,
      thisMonthItems,
      previousMonthItems,
      thisYearItems,
    ].find((items) => items.length > 0) ?? []
  const recentItems = getUniqueFeedItems([
    ...todayItems,
    ...yesterdayItems,
    ...recentThirdPeriodItems,
  ])
  const periodItems: Record<HomepageLaunchPeriod, HomepageFeedItem[]> = {
    recent: recentItems,
    lastWeek: lastWeekItems,
    thisMonth: thisMonthItems,
    previousMonth: previousMonthItems,
    thisYear: thisYearItems,
  }
  const selectedPeriod =
    launchPeriod && isHomepageLaunchPeriod(launchPeriod)
      ? launchPeriod
      : recentItems.length > 0
        ? "recent"
        : (HOMEPAGE_WINDOW_PERIOD_ORDER.find(
            (period) => periodItems[period].length > 0,
          ) ?? "recent")
  const organicItems = getUniqueFeedItems(periodItems[selectedPeriod])

  if (organicStartIndex >= organicItems.length) {
    return {
      items: [],
      page: safePage,
      pageSize: safePageSize,
      hasMore: false,
      nextPage: null,
      launchPeriod: selectedPeriod,
    }
  }

  let organicPageItems = organicItems.slice(
    organicStartIndex,
    organicStartIndex + safePageSize,
  )
  if (selectedPeriod === "recent" && safePage === 1) {
    organicPageItems = ensurePageIncludesPeriodItem(
      organicPageItems,
      recentThirdPeriodItems,
    )
  }
  const organicIds = new Set(organicPageItems.map((item) => item.id))
  const sponsoredItems = pools.sponsored.filter(
    (item) => !organicIds.has(item.id) && !excludedIds.has(item.id),
  )
  const [viewerOrganicItems, viewerSponsoredItems] =
    await applyViewerVoteStateToGroups(
      [organicPageItems, sponsoredItems],
      clerkUserId,
    )
  const hasMore =
    organicStartIndex + organicPageItems.length < organicItems.length

  return {
    items: interleaveSponsoredItems(
      viewerOrganicItems,
      viewerSponsoredItems,
      organicStartIndex,
    ),
    page: safePage,
    pageSize: safePageSize,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
    launchPeriod: selectedPeriod,
  }
}

async function findRotatedProducts({
  where,
  orderBy,
  start,
  take,
  total,
}: {
  where: Prisma.ProductWhereInput
  orderBy: Prisma.ProductOrderByWithRelationInput[]
  start: number
  take: number
  total: number
}) {
  if (take <= 0 || total <= 0) return []

  const firstTake = Math.min(take, total - start)
  const overflowTake = take - firstTake
  const firstPage = await prisma.product.findMany({
    where,
    orderBy,
    skip: start,
    take: firstTake,
    select: homepageFeedSelect,
  })

  if (overflowTake <= 0) return firstPage

  const wrappedPage = await prisma.product.findMany({
    where,
    orderBy,
    skip: 0,
    take: overflowTake,
    select: homepageFeedSelect,
  })

  return [...firstPage, ...wrappedPage]
}

async function getOrderedHomepageFeedPage({
  orderBy,
  where,
  page = 1,
  pageSize = HOMEPAGE_FEED_PAGE_SIZE,
  clerkUserId,
  excludeProductIds = [],
  rotate = false,
  sponsoredPlanIds,
  now,
}: GetOrderedHomepageFeedParams): Promise<HomepageFeedPageResult> {
  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, HOMEPAGE_FEED_PAGE_SIZE)

  const baseWhere = buildBaseWhere()
  const excludeWhere: Prisma.ProductWhereInput | null = excludeProductIds.length
    ? { id: { notIn: excludeProductIds.filter(Boolean) } }
    : null
  const combinedWhere =
    where && Object.keys(where).length > 0
      ? { AND: [baseWhere, where, ...(excludeWhere ? [excludeWhere] : [])] }
      : excludeWhere
        ? { AND: [baseWhere, excludeWhere] }
        : baseWhere

  const total = await prisma.product.count({ where: combinedWhere })
  const absoluteStart = (safePage - 1) * safePageSize

  if (total <= 0 || absoluteStart >= total) {
    return {
      items: [],
      page: safePage,
      pageSize: safePageSize,
      hasMore: false,
      nextPage: null,
      launchPeriod: null,
    }
  }

  const take = Math.min(safePageSize, total - absoluteStart)
  const products = rotate
    ? await findRotatedProducts({
        where: combinedWhere,
        orderBy,
        start:
          (getRotatedOffset(
            total,
            [HOMEPAGE_ROTATION_SEED, getShuffleDateKey(), safePageSize].join(
              ":",
            ),
          ) +
            absoluteStart) %
          total,
        take,
        total,
      })
    : await prisma.product.findMany({
        where: combinedWhere,
        orderBy,
        skip: absoluteStart,
        take,
        select: homepageFeedSelect,
      })

  const items = await buildFeedItemsFromProducts(
    products,
    clerkUserId,
    sponsoredPlanIds,
    now,
  )
  const hasMore = absoluteStart + items.length < total

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
    launchPeriod: null,
  }
}

function interleaveSponsoredItems(
  organicItems: HomepageFeedItem[],
  sponsoredItems: HomepageFeedItem[],
  organicStartIndex: number,
) {
  if (organicItems.length === 0) return organicItems
  if (sponsoredItems.length === 0) return organicItems

  const mixedItems: HomepageFeedItem[] = []

  if (organicStartIndex === 0) {
    mixedItems.push(sponsoredItems[0])
  }

  organicItems.forEach((item, organicIndex) => {
    mixedItems.push(item)

    const globalOrganicPosition = organicStartIndex + organicIndex + 1
    if (globalOrganicPosition % HOMEPAGE_SPONSORED_INTERVAL === 0) {
      const sponsoredSlotIndex =
        globalOrganicPosition / HOMEPAGE_SPONSORED_INTERVAL
      const sponsoredItem = sponsoredItems[sponsoredSlotIndex]

      if (sponsoredItem) {
        mixedItems.push(sponsoredItem)
      }
    }
  })

  return mixedItems
}

export async function getHomepageNewFeedPage(
  params: GetHomepageFeedPageParams = {},
): Promise<HomepageFeedPageResult> {
  const {
    page,
    pageSize,
    clerkUserId,
    excludeProductIds = [],
    launchWindow,
  } = params

  if (launchWindow === "week" || launchWindow === "homepage") {
    return getHomepageWeekFeedPageFromPools(params)
  }

  const safePage = normalizePage(page, 1)
  const safePageSize = normalizePageSize(pageSize, HOMEPAGE_FEED_PAGE_SIZE)
  const organicStartIndex = (safePage - 1) * safePageSize
  const now = new Date()
  const sponsoredPlanIds = await getSponsoredPlacementPlanIds()
  const sponsoredPlanIdSet = new Set(sponsoredPlanIds)
  const sponsoredPlacementWhere = buildSponsoredPlacementWhere(
    now,
    sponsoredPlanIds,
  )
  const launchWindowWhere = buildLaunchWindowWhere(launchWindow, now)
  const organicWhereParts: Prisma.ProductWhereInput[] = [
    { NOT: sponsoredPlacementWhere },
  ]
  if (launchWindowWhere) {
    organicWhereParts.push(launchWindowWhere)
  }
  const orderBy = getHomepageFeedOrderBy()

  const organicPage = await getOrderedHomepageFeedPage({
    page,
    pageSize: safePageSize,
    clerkUserId,
    excludeProductIds,
    where: { AND: organicWhereParts },
    orderBy,
    sponsoredPlanIds: sponsoredPlanIdSet,
    now,
  })

  if (organicPage.items.length === 0) {
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
    sponsoredProducts.filter(
      (product) => !excludeProductIds.includes(product.id),
    ),
    clerkUserId,
    sponsoredPlanIdSet,
    now,
  )

  return {
    ...organicPage,
    items: interleaveSponsoredItems(
      organicPage.items,
      sponsoredItems.sort(compareFeedItemsByShuffleRank),
      organicStartIndex,
    ),
  }
}

async function getHomepageFeedViewImpl(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  return getHomepageNewFeedPage(params)
}

function buildHomepageFeedCacheKey(params: GetHomepageFeedViewParams = {}) {
  const page = normalizePage(params.page, 1)
  const pageSize = normalizePageSize(params.pageSize, HOMEPAGE_FEED_PAGE_SIZE)
  const view = params.view ?? "new"
  const launchWindow = params.launchWindow ?? "all"
  const launchPeriod = params.launchPeriod ?? "auto"
  const excluded =
    params.excludeProductIds?.filter(Boolean).sort().join(",") || "none"
  const viewer = params.clerkUserId ? `user:${params.clerkUserId}` : "anon"

  return buildCacheKey(
    "homepage",
    "feed",
    HOMEPAGE_FEED_CACHE_VERSION,
    getShuffleDateKey(),
    view,
    launchWindow,
    launchPeriod,
    excluded,
    page,
    pageSize,
    viewer,
  )
}

export async function getHomepageFeedView(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  const cacheKey = buildHomepageFeedCacheKey(params)

  return cacheGetOrSet({
    key: cacheKey,
    ttlSeconds: HOMEPAGE_FEED_CACHE_TTL_SECONDS,
    loader: () => getHomepageFeedViewImpl(params),
    onError: (error) => {
      console.error("[homepage] failed to use Redis feed cache", {
        cacheKey,
        error,
      })
    },
  })
}

export async function invalidateHomepageFeedCache() {
  return invalidateCacheByPrefix({
    keyPrefix: HOMEPAGE_FEED_CACHE_PREFIX,
    onError: (error) => {
      console.error("[homepage] failed to invalidate Redis feed cache", {
        cachePrefix: HOMEPAGE_FEED_CACHE_PREFIX,
        error,
      })
    },
  })
}

async function getHomepageLaunchOfDayForRefresh(useNextCache = true) {
  if (!useNextCache) {
    return getLaunchOfDayImpl()
  }

  try {
    return await getHomepageLaunchOfDay()
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`
    if (!message.includes("incrementalCache missing")) {
      throw error
    }

    console.warn(
      "[homepage] falling back to uncached launch of day refresh outside Next cache context",
      { reason: "incrementalCache missing" },
    )
    return getLaunchOfDayImpl()
  }
}

export async function refreshHomepageFeedCache(
  options: RefreshHomepageFeedCacheOptions = {},
) {
  const { revalidateNextCache = true, useNextLaunchCache = true } = options
  const invalidation = await invalidateHomepageFeedCache()
  if (revalidateNextCache) {
    revalidateHomepage("revalidate")
  }
  const [weekInitialPage, weekApiPage, allInitialPage, launchOfDay] =
    await Promise.all([
      getHomepageFeedView({
        page: 1,
        pageSize: HOMEPAGE_INITIAL_FEED_PAGE_SIZE,
        view: "new",
        launchWindow: "homepage",
      }),
      getHomepageFeedView({
        page: 1,
        pageSize: HOMEPAGE_FEED_PAGE_SIZE,
        view: "new",
        launchWindow: "homepage",
      }),
      getHomepageFeedView({
        page: 1,
        pageSize: HOMEPAGE_INITIAL_FEED_PAGE_SIZE,
        view: "new",
        launchWindow: "all",
      }),
      getHomepageLaunchOfDayForRefresh(useNextLaunchCache),
    ])

  return {
    success: true,
    invalidation,
    warmed: {
      weekInitialPageItems: weekInitialPage.items.length,
      weekApiPageItems: weekApiPage.items.length,
      allInitialPageItems: allInitialPage.items.length,
      launchOfDayProductId: launchOfDay?.id ?? null,
    },
  }
}

export async function getHomepageFeedPage(
  params: GetHomepageFeedViewParams = {},
): Promise<HomepageFeedPageResult> {
  return getHomepageFeedView(params)
}

async function getLaunchOfDayImpl(): Promise<HomepageLaunchOfDay | null> {
  const now = new Date()
  const startToday = startOfUtcDayDate(now)
  const startTomorrow = addUtcDaysDate(startToday, 1)
  const launchedTodayWhere: Prisma.ProductWhereInput = {
    OR: [
      { publishedAt: { gte: startToday, lt: startTomorrow } },
      {
        publishedAt: null,
        createdAt: { gte: startToday, lt: startTomorrow },
      },
    ],
  }
  const run = await getCurrentLeaderboardRun()
  const todayTopScore = run
    ? await prisma.productLeaderboardScore.findFirst({
        where: {
          runId: run.id,
          product: {
            AND: [buildBaseWhere(), launchedTodayWhere],
          },
        },
        orderBy: [
          { score: "desc" },
          { upvotes: "desc" },
          { uniqueVisitors: "desc" },
          { views: "desc" },
        ],
        select: {
          rank: true,
          score: true,
          product: { select: homepageFeedSelect },
        },
      })
    : null

  const fallbackTopScore = todayTopScore
    ? null
    : run
      ? await prisma.productLeaderboardScore.findFirst({
          where: {
            runId: run.id,
            product: buildBaseWhere(),
          },
          orderBy: [
            { score: "desc" },
            { upvotes: "desc" },
            { uniqueVisitors: "desc" },
            { views: "desc" },
          ],
          select: {
            rank: true,
            score: true,
            product: { select: homepageFeedSelect },
          },
        })
      : null

  const selectedScore = todayTopScore ?? fallbackTopScore
  const todayFallbackProduct = selectedScore
    ? null
    : await prisma.product.findFirst({
        where: {
          AND: [buildBaseWhere(), launchedTodayWhere],
        },
        orderBy: [
          { analytics: { upvotes: "desc" } },
          { publishedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        select: homepageFeedSelect,
      })
  const fallbackProduct =
    selectedScore || todayFallbackProduct
      ? null
      : await prisma.product.findFirst({
          where: buildBaseWhere(),
          orderBy: [
            { analytics: { upvotes: "desc" } },
            { publishedAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          select: homepageFeedSelect,
        })

  const product =
    selectedScore?.product ?? todayFallbackProduct ?? fallbackProduct
  if (!product) return null

  const sponsoredPlanIds = new Set(await getSponsoredPlacementPlanIds())
  const item = (
    await buildFeedItemsFromProducts([product], null, sponsoredPlanIds, now)
  )[0]
  if (!item) return null

  const reportingWindow = getAnalyticsReportingWindow(now)
  const previousReportingWindow =
    getPreviousAnalyticsReportingWindow(reportingWindow)
  const currentStart = reportingWindow.start
  const currentEndExclusive = addUtcDaysDate(reportingWindow.end, 1)
  const previousStart = previousReportingWindow.start
  const cachedVisitors = item.interest?.visitors

  const [recommenderCount, currentUpvotes, previousUpvotes, storedVisitors] =
    await Promise.all([
      prisma.productUpvote.count({
        where: { productId: product.id },
      }),
      prisma.productUpvote.count({
        where: {
          productId: product.id,
          createdAt: { gte: currentStart, lt: currentEndExclusive },
        },
      }),
      prisma.productUpvote.count({
        where: {
          productId: product.id,
          createdAt: { gte: previousStart, lt: currentStart },
        },
      }),
      cachedVisitors == null
        ? prisma.productTrafficDaily.aggregate({
            where: {
              productId: product.id,
              date: { gte: currentStart, lte: reportingWindow.end },
            },
            _sum: {
              uniqueVisitors: true,
            },
          })
        : Promise.resolve(null),
    ])

  return {
    ...item,
    rank: selectedScore?.rank ?? null,
    score: selectedScore?.score ?? item.scoreCount ?? null,
    upvoteGrowthPercent: calculatePercentChange(
      currentUpvotes,
      previousUpvotes,
    ),
    visitorsInWindow:
      cachedVisitors ?? storedVisitors?._sum.uniqueVisitors ?? 0,
    recommenderCount,
    recommenderAvatarUrls: [],
  }
}

export async function getHomepageLaunchOfDay() {
  "use cache"
  applyCache(
    [
      "homepage-feed",
      "homepage",
      "products",
      "leaderboard",
      "analytics",
      "upvotes",
    ],
    60,
  )

  return getLaunchOfDayImpl()
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
