import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { cacheGetOrSet, cacheHit, cacheMiss } from "@/lib/server/cache"
import {
  normalizeMonth,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/leaderboard/months"
import {
  getIsoWeekKey,
  getIsoWeekYearAndNumber,
} from "@/lib/server/leaderboard/weeks"
import {
  generateLeaderboardRun,
  computeLeaderboardWindow,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import { CLOUDFLARE_ANALYTICS_MIN_START_DATE } from "@/lib/server/analytics/cloudflareAnalytics"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import {
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import type { Prisma } from "@/lib/vendor/prisma/client"

const buildCategorySlugFilter = (
  categorySlug: string,
): Prisma.ProductWhereInput => ({
  OR: [
    { category: { is: { slug: categorySlug } } },
    {
      categories: {
        some: { category: { is: { slug: categorySlug } } },
      },
    },
  ],
})

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})

const shortDayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const DAY_MS = 86_400_000
const MONTH_LOOKBACK = 12
const MIN_MONTH_DAYS = 28
const MAX_MONTH_DAYS = 32
const HISTORICAL_PERIODIC_LEADERBOARD_CACHE_VERSION_KEY = [
  "leaderboard",
  "periodic",
  "historical",
  "version",
] as const
const HISTORICAL_PERIODIC_LEADERBOARD_CACHE_PREFIX = [
  "leaderboard",
  "periodic",
  "historical",
  "v2",
] as const
const HISTORICAL_PERIODIC_LEADERBOARD_WARM_DAYS = 14

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )

const ANALYTICS_MIN_LEADERBOARD_DATE = startOfUtcDay(
  new Date(`${CLOUDFLARE_ANALYTICS_MIN_START_DATE}T00:00:00Z`),
)

export type LeaderboardHighlightPeriod = "day" | "week" | "month"
export type PeriodLeaderboardKind = LeaderboardHighlightPeriod

type PeriodicLeaderboardArchive = {
  months: Array<{ year: number; month: number }>
  weeks: Array<{ year: number; week: number }>
}

export type PeriodicLeaderboardPayload = {
  period: LeaderboardHighlightPeriod
  periodLabel: string
  periodStart: Date
  periodEnd: Date
  products: ProductCardRecord[]
  archive: PeriodicLeaderboardArchive
}

type PeriodicLeaderboardArgs = {
  period: LeaderboardHighlightPeriod
  periodStart: Date
  periodEnd: Date
  limit?: number
  label?: string
  categorySlug?: string | null
}

type CachedProductCardRecord = Omit<
  ProductCardRecord,
  "createdAt" | "updatedAt" | "ProductBadge" | "planGrants"
> & {
  createdAt: Date | string
  updatedAt: Date | string
  ProductBadge?: Array<{
    badge: string
    expiresAt: Date | string | null
  }> | null
  planGrants?: Array<
    Omit<ProductCardRecord["planGrants"][number], "startsAt" | "expiresAt"> & {
      startsAt: Date | string
      expiresAt: Date | string | null
    }
  > | null
}

function getPeriodWindow(
  period: LeaderboardHighlightPeriod,
  now: Date = new Date(),
) {
  if (period === "day") {
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    )
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 1)
    return { periodStart: start, periodEnd: end }
  }

  if (period === "week") {
    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    )
    const day = startOfDay.getUTCDay()
    const diff = (day + 6) % 7 // Monday as the first day of the week
    const start = new Date(startOfDay)
    start.setUTCDate(startOfDay.getUTCDate() - diff)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    return { periodStart: start, periodEnd: end }
  }

  return getCurrentLeaderboardWindow(now)
}

function getPreviousCompletedPeriodWindow(
  period: Exclude<LeaderboardHighlightPeriod, "month">,
  now: Date,
) {
  const currentPeriod = getPeriodWindow(period, now)
  const previousPeriod = getPeriodWindow(
    period,
    new Date(currentPeriod.periodStart.getTime() - 1),
  )

  return {
    periodStart: previousPeriod.periodStart,
    periodEnd: currentPeriod.periodStart,
  }
}

function formatPeriodLabel(
  period: LeaderboardHighlightPeriod,
  periodStart: Date,
  periodEnd: Date,
) {
  if (period === "day") {
    return dayLabelFormatter.format(periodStart)
  }
  if (period === "week") {
    const end = new Date(periodEnd)
    end.setUTCDate(end.getUTCDate() - 1)
    return `${shortDayLabelFormatter.format(periodStart)} - ${shortDayLabelFormatter.format(end)}`
  }
  return monthLabelFormatter.format(periodStart)
}

function startOfIsoWeek(year: number, week: number): Date | null {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(week) ||
    week < 1 ||
    week > 53
  ) {
    return null
  }
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7 // Monday=1
  const start = new Date(jan4)
  start.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7)
  return start
}

export async function resolvePeriodWindowFromParts(args: {
  period: LeaderboardHighlightPeriod
  year: number
  month?: number
  day?: number
  week?: number
}): Promise<{ periodStart: Date; periodEnd: Date; label: string } | null> {
  const year = Number(args.year)
  if (!Number.isFinite(year) || year < 1970 || year > 3000) return null
  const earliestAllowedMs = ANALYTICS_MIN_LEADERBOARD_DATE.getTime()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  if (args.period === "day") {
    const month = Number(args.month)
    const day = Number(args.day)
    if (
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null
    }
    const start = new Date(Date.UTC(year, month - 1, day))
    if (
      start.getUTCFullYear() !== year ||
      start.getUTCMonth() !== month - 1 ||
      start.getUTCDate() !== day
    ) {
      return null
    }
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 1)
    if (start.getTime() < earliestAllowedMs) {
      return null
    }
    if (start.getTime() > today.getTime()) {
      return null
    }
    return {
      periodStart: start,
      periodEnd: end,
      label: formatPeriodLabel("day", start, end),
    }
  }

  if (args.period === "week") {
    const week = Number(args.week)
    const start = startOfIsoWeek(year, week)
    if (!start) return null
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    if (start.getTime() < earliestAllowedMs) {
      return null
    }
    if (start.getTime() > today.getTime()) {
      return null
    }
    return {
      periodStart: start,
      periodEnd: end,
      label: formatPeriodLabel("week", start, end),
    }
  }

  const month = Number(args.month)
  if (!Number.isFinite(month) || month < 1 || month > 12) return null
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  if (start.getTime() < earliestAllowedMs) {
    return null
  }
  if (start.getTime() > today.getTime()) {
    return null
  }
  return {
    periodStart: start,
    periodEnd: end,
    label: formatPeriodLabel("month", start, end),
  }
}

const monthKeyFromParts = (year: number, month: number) => `${year}-${month}`

const sortMonthsDesc = (
  a: { year: number; month: number },
  b: { year: number; month: number },
) => {
  if (a.year !== b.year) return b.year - a.year
  return b.month - a.month
}

const sortWeeksDesc = (
  a: { year: number; week: number },
  b: { year: number; week: number },
) => {
  const aStart = startOfIsoWeek(a.year, a.week)?.getTime() ?? 0
  const bStart = startOfIsoWeek(b.year, b.week)?.getTime() ?? 0
  return bStart - aStart
}

async function loadPeriodicArchiveRaw(): Promise<PeriodicLeaderboardArchive> {
  const now = new Date()
  const earliestMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTH_LOOKBACK - 1), 1),
  )

  const months = new Map<string, { year: number; month: number }>()
  const weeks = new Map<string, { year: number; week: number }>()

  const addMonth = (date: Date) => {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const key = monthKeyFromParts(year, month)
    if (!months.has(key)) {
      months.set(key, { year, month })
    }
  }

  const addWeek = (date: Date) => {
    const { year, week } = getIsoWeekYearAndNumber(date)
    const key = getIsoWeekKey(date)
    if (!weeks.has(key)) {
      weeks.set(key, { year, week })
    }
    addMonth(date)
  }

  const runsWithScores = await prisma.leaderboardRun.findMany({
    where: {
      periodStart: { gte: earliestMonth },
      scores: { some: { score: { gt: 0 } } },
    },
    select: { periodStart: true, periodEnd: true },
    orderBy: { periodStart: "desc" },
  })

  runsWithScores.forEach((run: { periodStart: Date; periodEnd: Date }) => {
    const durationDays = Math.round(
      (run.periodEnd.getTime() - run.periodStart.getTime()) / DAY_MS,
    )
    if (durationDays === 7) {
      addWeek(run.periodStart)
    } else if (
      durationDays >= MIN_MONTH_DAYS &&
      durationDays <= MAX_MONTH_DAYS
    ) {
      addMonth(run.periodStart)
    } else if (durationDays === 1) {
      addWeek(run.periodStart)
    }
  })

  const upvotes = await prisma.productUpvote.findMany({
    where: {
      createdAt: { gte: earliestMonth, lt: now },
      product: buildPublicDiscoveryProductWhere(),
    },
    select: { createdAt: true },
  })

  upvotes.forEach(({ createdAt }: { createdAt: Date }) => addWeek(createdAt))

  return {
    months: Array.from(months.values()).sort(sortMonthsDesc),
    weeks: Array.from(weeks.values()).sort(sortWeeksDesc),
  }
}

async function getPeriodicArchive() {
  "use cache"
  applyCache([TAGS.leaderboard], DEFAULT_TTL.slow)

  return loadPeriodicArchiveRaw()
}

export async function getLeaderboardStats() {
  "use cache"
  applyCache(
    [TAGS.leaderboard, TAGS.analytics, TAGS.products],
    DEFAULT_TTL.fast,
  )

  const analyticsProvider = getAnalyticsProvider("cache")
  const [
    totalProducts,
    totalCreators,
    upvoteAgg,
    topProduct,
    homepageTraffic,
    realtimeVisitors,
  ] = await Promise.all([
    prisma.product.count({}),
    prisma.user.count({}),
    prisma.productAnalytics.aggregate({
      _sum: { upvotes: true },
    }),
    prisma.productAnalytics.findFirst({
      orderBy: { upvotes: "desc" },
      select: { upvotes: true },
    }),
    analyticsProvider.getHomepageTraffic(),
    analyticsProvider.getRealtimeVisitors(),
  ])

  return {
    totalProducts,
    totalCreators,
    totalUpvotes: upvoteAgg._sum.upvotes ?? 0,
    topScore: topProduct?.upvotes ?? 0,
    analyticsWindowDays: homepageTraffic.windowDays,
    pageViews: homepageTraffic.pageViews,
    visitors: homepageTraffic.visitors,
    trafficSeries: homepageTraffic.trafficSeries,
    realtimeVisitors,
  }
}

async function getOrCreateActiveLeaderboardRun() {
  const { periodStart, periodEnd } = getCurrentLeaderboardWindow()
  const existing = await prisma.leaderboardRun.findUnique({
    where: {
      periodStart_periodEnd: {
        periodStart,
        periodEnd,
      },
    },
    select: { id: true, periodStart: true, periodEnd: true, status: true },
  })

  if (existing) {
    // Ensure run has scores; if not, populate once.
    const hasScores = await prisma.productLeaderboardScore.findFirst({
      where: { runId: existing.id },
      select: { id: true },
    })
    if (!hasScores) {
      await generateLeaderboardRun({
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        asOf: new Date(),
      })
    }
    return existing
  }

  const generated = await generateLeaderboardRun({
    periodStart,
    periodEnd,
    asOf: new Date(),
  })
  if (generated.deferred) return null

  const created = await prisma.leaderboardRun.findUnique({
    where: { id: generated.runId },
    select: { id: true, periodStart: true, periodEnd: true },
  })

  return created ?? { id: generated.runId, periodStart, periodEnd }
}

export async function getTopRankedProducts(args?: {
  limit?: number
  categorySlug?: string
}) {
  "use cache"
  applyCache(
    [
      TAGS.leaderboard,
      TAGS.products,
      TAGS.analytics,
      TAGS.categories,
      TAGS.category(String(args?.categorySlug ?? "all")),
    ],
    DEFAULT_TTL.fast,
  )

  const limit = args?.limit ?? 50
  const categorySlug = args?.categorySlug

  // Ensure the run exists and is populated before reading scores.
  const run = await getOrCreateActiveLeaderboardRun()
  if (!run) return []

  const scoreExists = await prisma.productLeaderboardScore.findFirst({
    where: { runId: run.id },
    select: { id: true },
  })
  if (!scoreExists) {
    await generateLeaderboardRun({
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      asOf: new Date(),
    })
  }

  const productWhere = buildPublicDiscoveryProductWhere(
    categorySlug ? buildCategorySlugFilter(categorySlug) : undefined,
  )

  const scores = await prisma.productLeaderboardScore.findMany({
    take: limit,
    where: {
      runId: run.id,
      product: { is: productWhere },
    },
    orderBy: [{ score: "desc" }, { upvotes: "desc" }, { productId: "asc" }],
    include: {
      product: {
        select: productCardSelect,
      },
    },
  })

  return scores.map((entry: (typeof scores)[number]) => ({
    ...entry.product,
    scoreCount: entry.score,
    leaderboardRank: entry.rank ?? undefined,
  })) as unknown as ProductCardRecord[]
}

export type ProductOfThePeriodResult = {
  period: LeaderboardHighlightPeriod
  label: string
  periodStart: Date
  periodEnd: Date
  products: ProductCardRecord[]
}

async function resolveProductOfThePeriod(
  period: LeaderboardHighlightPeriod,
  limit = 3,
): Promise<ProductOfThePeriodResult> {
  const now = new Date()
  const { periodStart, periodEnd } =
    period === "month"
      ? getPeriodWindow(period, now)
      : getPreviousCompletedPeriodWindow(period, now)
  const label = formatPeriodLabel(period, periodStart, periodEnd)

  if (period === "month") {
    const run = await getOrCreateActiveLeaderboardRun()
    if (!run) {
      return { period, label, periodStart, periodEnd, products: [] }
    }

    const rows = await prisma.productLeaderboardScore.findMany({
      where: {
        runId: run.id,
        score: { gt: 0 },
        product: { is: buildPublicDiscoveryProductWhere() },
      },
      orderBy: [{ score: "desc" }, { upvotes: "desc" }, { productId: "asc" }],
      include: {
        product: {
          select: productCardSelect,
        },
      },
    })

    const results = rows
      .slice(0, limit)
      .map((row: (typeof rows)[number], index: number) => ({
        ...row.product,
        scoreCount: row.score ?? 0,
        leaderboardRank: index + 1,
      })) as unknown as ProductCardRecord[]

    return {
      period,
      label,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      products: results,
    }
  }

  const rankedRows = await computeLeaderboardWindow({
    periodStart,
    periodEnd,
    asOf: periodEnd,
  })
  const winners = rankedRows.slice(0, limit)
  const productIds = winners.map((row) => row.productId)
  if (!productIds.length) {
    return { period, label, periodStart, periodEnd, products: [] }
  }

  const products = await prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere({ id: { in: productIds } }),
    select: productCardSelect,
  })
  const productMap = new Map(
    products.map((product: (typeof products)[number]) => [product.id, product]),
  )

  const results = winners
    .map((row, index) => {
      const product = productMap.get(row.productId)
      if (!product) return null
      return {
        ...product,
        scoreCount: row.score ?? 0,
        leaderboardRank: row.rank ?? index + 1,
      } as ProductCardRecord & { scoreCount?: number; leaderboardRank?: number }
    })
    .filter(
      (
        value,
      ): value is ProductCardRecord & {
        scoreCount?: number
        leaderboardRank?: number
      } => Boolean(value),
    )

  return { period, label, periodStart, periodEnd, products: results }
}

export async function getProductOfThePeriod(args?: {
  period?: LeaderboardHighlightPeriod
  limit?: number
}) {
  "use cache"
  applyCache(
    [TAGS.leaderboard, TAGS.analytics, TAGS.products],
    DEFAULT_TTL.fast,
  )

  const period = args?.period ?? "day"
  const limit = args?.limit ?? 3
  return resolveProductOfThePeriod(period, limit)
}

export async function getProductOfTheMoments(args?: { limit?: number }) {
  "use cache"
  applyCache(
    [TAGS.leaderboard, TAGS.analytics, TAGS.products],
    DEFAULT_TTL.fast,
  )

  const limit = args?.limit ?? 3
  const [day, week, month] = await Promise.all([
    resolveProductOfThePeriod("day", limit),
    resolveProductOfThePeriod("week", limit),
    resolveProductOfThePeriod("month", limit),
  ])
  return { day, week, month }
}

export type MonthlyLeaderboardMonth = {
  month: string
  label: string
}

async function mapRowsToProducts(
  rows: Awaited<ReturnType<typeof computeLeaderboardWindow>>,
  limit?: number,
): Promise<ProductCardRecord[]> {
  const winners =
    typeof limit === "number" ? rows.slice(0, limit) : rows.slice(0)
  const productIds = winners.map((row) => row.productId)
  if (!productIds.length) return []

  const products = await prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere({ id: { in: productIds } }),
    select: productCardSelect,
  })
  const productMap = new Map(
    products.map((product: (typeof products)[number]) => [product.id, product]),
  )

  return winners
    .map((row, index) => {
      const product = productMap.get(row.productId)
      if (!product) return null
      return {
        ...product,
        scoreCount: row.score ?? 0,
        leaderboardRank: row.rank ?? index + 1,
      }
    })
    .filter(Boolean) as unknown as ProductCardRecord[]
}

async function mapRunRowsToProducts(params: {
  periodStart: Date
  periodEnd: Date
  limit?: number
  categorySlug?: string | null
}): Promise<ProductCardRecord[] | null> {
  const run = await prisma.leaderboardRun.findUnique({
    where: {
      periodStart_periodEnd: {
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      },
    },
    select: { id: true },
  })
  if (!run) return null

  const categorySlug =
    typeof params.categorySlug === "string" && params.categorySlug.trim().length
      ? params.categorySlug.trim()
      : null

  const productWhere = buildPublicDiscoveryProductWhere(
    categorySlug ? buildCategorySlugFilter(categorySlug) : undefined,
  )

  const rows = await prisma.productLeaderboardScore.findMany({
    where: {
      runId: run.id,
      score: { gt: 0 },
      product: { is: productWhere },
    },
    orderBy: [{ rank: "asc" }, { score: "desc" }, { upvotes: "desc" }],
    take: params.limit ?? undefined,
    include: {
      product: {
        select: productCardSelect,
      },
    },
  })

  if (!rows.length) return []

  return rows.map((row: (typeof rows)[number], index: number) => ({
    ...row.product,
    scoreCount: row.score ?? 0,
    leaderboardRank: categorySlug ? index + 1 : (row.rank ?? index + 1),
  })) as unknown as ProductCardRecord[]
}

function isClosedLeaderboardWindow(periodEnd: Date) {
  return periodEnd.getTime() <= Date.now()
}

function serializePeriodicLeaderboardPayload(
  payload: PeriodicLeaderboardPayload,
): string {
  return JSON.stringify(payload)
}

function hydrateProductCardRecord(product: CachedProductCardRecord) {
  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt),
    ProductBadge:
      product.ProductBadge?.map((badge) => ({
        ...badge,
        expiresAt: badge.expiresAt ? new Date(badge.expiresAt) : null,
      })) ?? [],
    planGrants:
      product.planGrants?.map((grant) => ({
        ...grant,
        startsAt: new Date(grant.startsAt),
        expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : null,
      })) ?? [],
  } as ProductCardRecord
}

function deserializePeriodicLeaderboardPayload(
  value: string,
): PeriodicLeaderboardPayload {
  const payload = JSON.parse(value) as Omit<
    PeriodicLeaderboardPayload,
    "periodStart" | "periodEnd" | "products"
  > & {
    periodStart: string
    periodEnd: string
    products: CachedProductCardRecord[]
  }

  return {
    ...payload,
    periodStart: new Date(payload.periodStart),
    periodEnd: new Date(payload.periodEnd),
    products: payload.products.map(hydrateProductCardRecord),
  }
}

async function getHistoricalPeriodicLeaderboardCacheVersion() {
  const version = await cacheHit<string>({
    key: HISTORICAL_PERIODIC_LEADERBOARD_CACHE_VERSION_KEY,
    deserialize: (value) => value,
    onError: (error) => {
      console.warn("[leaderboard.periodic.cache] version read failed", error)
    },
  })

  return version ?? "1"
}

export async function invalidateHistoricalPeriodicLeaderboardCache(
  reason = "manual",
) {
  const version = `${Date.now()}`
  await cacheMiss({
    key: HISTORICAL_PERIODIC_LEADERBOARD_CACHE_VERSION_KEY,
    value: version,
    serialize: (value) => value,
    onError: (error) => {
      console.warn("[leaderboard.periodic.cache] version write failed", error)
    },
  })

  console.info("[leaderboard.periodic.cache] invalidated", { reason, version })
  return { version }
}

async function getHistoricalPeriodicLeaderboardCacheKey(
  args: PeriodicLeaderboardArgs,
) {
  const version = await getHistoricalPeriodicLeaderboardCacheVersion()
  return [
    ...HISTORICAL_PERIODIC_LEADERBOARD_CACHE_PREFIX,
    version,
    args.period,
    args.periodStart.toISOString(),
    args.periodEnd.toISOString(),
    typeof args.limit === "number" ? `limit:${args.limit}` : "limit:all",
    args.categorySlug ? `category:${args.categorySlug}` : "category:all",
  ] as const
}

async function loadPeriodicLeaderboard(
  args: PeriodicLeaderboardArgs,
  options?: {
    archiveLoader?: () => Promise<PeriodicLeaderboardArchive>
  },
): Promise<PeriodicLeaderboardPayload> {
  const limit = args.limit
  const periodLabel =
    args.label ??
    formatPeriodLabel(args.period, args.periodStart, args.periodEnd)
  const archivePromise = (options?.archiveLoader ?? getPeriodicArchive)()
  const categorySlug =
    typeof args.categorySlug === "string" && args.categorySlug.trim().length
      ? args.categorySlug.trim()
      : null

  const runProducts = await mapRunRowsToProducts({
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    limit,
    categorySlug,
  })
  if (
    runProducts &&
    (runProducts.length > 0 || isClosedLeaderboardWindow(args.periodEnd))
  ) {
    return {
      period: args.period,
      periodLabel,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      products: runProducts,
      archive: await archivePromise,
    }
  }

  const filteredProductIds = categorySlug
    ? (
        await prisma.product.findMany({
          where: buildPublicDiscoveryProductWhere(
            buildCategorySlugFilter(categorySlug),
          ),
          select: { id: true },
        })
      ).map((row: { id: string }) => row.id)
    : null

  if (categorySlug && !filteredProductIds?.length) {
    return {
      period: args.period,
      periodLabel,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      products: [],
      archive: await archivePromise,
    }
  }

  const [archive, rankedRows] = await Promise.all([
    archivePromise,
    computeLeaderboardWindow({
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      asOf: new Date(),
      limit,
      productIds: filteredProductIds ?? undefined,
    }),
  ])
  const products = await mapRowsToProducts(rankedRows, limit)

  return {
    period: args.period,
    periodLabel,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    products,
    archive,
  }
}

async function getActivePeriodicLeaderboard(args: PeriodicLeaderboardArgs) {
  "use cache"
  applyCache(
    [TAGS.leaderboard, TAGS.analytics, TAGS.products],
    DEFAULT_TTL.slow,
  )

  return loadPeriodicLeaderboard(args)
}

async function getHistoricalPeriodicLeaderboard(
  args: PeriodicLeaderboardArgs,
  options?: {
    archiveLoader?: () => Promise<PeriodicLeaderboardArchive>
  },
): Promise<PeriodicLeaderboardPayload> {
  const key = await getHistoricalPeriodicLeaderboardCacheKey(args)
  return cacheGetOrSet({
    key,
    serialize: serializePeriodicLeaderboardPayload,
    deserialize: deserializePeriodicLeaderboardPayload,
    onError: (error) => {
      console.warn("[leaderboard.periodic.cache] read/write failed", error)
    },
    loader: () => loadPeriodicLeaderboard(args, options),
  })
}

export async function getPeriodicLeaderboard(
  args: PeriodicLeaderboardArgs,
): Promise<PeriodicLeaderboardPayload> {
  if (!isClosedLeaderboardWindow(args.periodEnd)) {
    return getActivePeriodicLeaderboard(args)
  }

  return getHistoricalPeriodicLeaderboard(args)
}

export async function warmHistoricalPeriodicLeaderboardCache(args?: {
  limit?: number
  days?: number
}) {
  const limit = args?.limit ?? 100
  const days = args?.days ?? HISTORICAL_PERIODIC_LEADERBOARD_WARM_DAYS
  const archive = await loadPeriodicArchiveRaw()
  const windows = new Map<string, PeriodicLeaderboardArgs>()
  const now = new Date()
  const today = startOfUtcDay(now)

  const addWindow = (window: PeriodicLeaderboardArgs) => {
    if (!isClosedLeaderboardWindow(window.periodEnd)) return
    const key = [
      window.period,
      window.periodStart.toISOString(),
      window.periodEnd.toISOString(),
    ].join(":")
    if (!windows.has(key)) {
      windows.set(key, window)
    }
  }

  for (const month of archive.months) {
    const periodStart = new Date(Date.UTC(month.year, month.month - 1, 1))
    const periodEnd = new Date(Date.UTC(month.year, month.month, 1))
    addWindow({
      period: "month",
      periodStart,
      periodEnd,
      limit,
      label: formatPeriodLabel("month", periodStart, periodEnd),
    })
  }

  for (const week of archive.weeks) {
    const periodStart = startOfIsoWeek(week.year, week.week)
    if (!periodStart) continue
    const periodEnd = new Date(periodStart)
    periodEnd.setUTCDate(periodStart.getUTCDate() + 7)
    addWindow({
      period: "week",
      periodStart,
      periodEnd,
      limit,
      label: formatPeriodLabel("week", periodStart, periodEnd),
    })
  }

  for (let offset = 1; offset <= days; offset += 1) {
    const periodStart = new Date(today)
    periodStart.setUTCDate(today.getUTCDate() - offset)
    if (periodStart.getTime() < ANALYTICS_MIN_LEADERBOARD_DATE.getTime()) break
    const periodEnd = new Date(periodStart)
    periodEnd.setUTCDate(periodStart.getUTCDate() + 1)
    addWindow({
      period: "day",
      periodStart,
      periodEnd,
      limit,
      label: formatPeriodLabel("day", periodStart, periodEnd),
    })
  }

  let warmed = 0
  for (const window of windows.values()) {
    await getHistoricalPeriodicLeaderboard(window, {
      archiveLoader: loadPeriodicArchiveRaw,
    })
    warmed += 1
  }

  return { success: true, warmed, limit, days }
}

export async function getPeriodicLeaderboardByParams(args: {
  period: LeaderboardHighlightPeriod
  year: number
  month?: number
  day?: number
  week?: number
  limit?: number
  categorySlug?: string | null
}): Promise<PeriodicLeaderboardPayload | null> {
  const window = await resolvePeriodWindowFromParts(args)
  if (!window) return null

  return getPeriodicLeaderboard({
    period: args.period,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    limit: args.limit,
    label: window.label,
    categorySlug: args.categorySlug,
  })
}

export async function getMonthlyLeaderboardMonths() {
  "use cache"
  applyCache([TAGS.monthlyLeaderboard], DEFAULT_TTL.slow)

  const runs: Array<{ periodStart: Date }> =
    await prisma.leaderboardRun.findMany({
      distinct: ["periodStart"],
      orderBy: { periodStart: "desc" },
      select: { periodStart: true },
    })

  return runs
    .map(({ periodStart }) => ({
      month: toMonthKey(periodStart),
      label: monthLabelFormatter.format(periodStart),
      date: periodStart,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(({ month, label }) => ({
      month,
      label,
    })) satisfies MonthlyLeaderboardMonth[]
}

const resolveTargetMonth = async (month?: string) => {
  const input = parseMonthKey(month)
  if (input) {
    return normalizeMonth(input)
  }
  const { periodStart } = getCurrentLeaderboardWindow()
  return normalizeMonth(periodStart)
}

export async function getMonthlyTopRankedProducts(args?: {
  month?: string
  limit?: number
}) {
  "use cache"
  applyCache(
    [
      TAGS.monthlyLeaderboard,
      TAGS.monthlyLeaderboardMonth(
        args?.month && parseMonthKey(args.month) ? args.month : "resolved",
      ),
    ],
    DEFAULT_TTL.slow,
  )

  const limit = args?.limit ?? 10
  const targetMonth = await resolveTargetMonth(args?.month)
  const monthKey = toMonthKey(targetMonth)

  const periodStart = targetMonth
  const periodEnd = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 1),
  )

  const run =
    (await prisma.leaderboardRun.findUnique({
      where: {
        periodStart_periodEnd: {
          periodStart,
          periodEnd,
        },
      },
    })) ??
    (await generateLeaderboardRun({
      periodStart,
      periodEnd,
      asOf: new Date(),
    }).then(async ({ runId, deferred }) =>
      deferred
        ? null
        : prisma.leaderboardRun.findUnique({ where: { id: runId } }),
    ))

  const rankings = run
    ? await prisma.productLeaderboardScore.findMany({
        take: limit,
        where: { runId: run.id },
        orderBy: [{ rank: "asc" }, { score: "desc" }, { upvotes: "desc" }],
        include: {
          product: {
            include: {
              category: true,
              analytics: true,
              ProductBadge: true,
              user: true,
            },
          },
        },
      })
    : []

  return {
    month: monthKey,
    label: monthLabelFormatter.format(targetMonth),
    rankings,
  }
}
