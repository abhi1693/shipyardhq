import prisma from "@/lib/prisma"
import { getAppBaseUrl } from "@/lib/app-url"
import { monthlyLeaderboardArchivePath } from "@/lib/routes"
import { revalidateBadges, revalidateProduct } from "@/lib/cache/revalidate"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { dispatchEventAsync } from "@/lib/server/events"
import {
  computeLeaderboardWindow,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import { normalizeMonth, toMonthKey } from "@/lib/server/leaderboard/months"
import { getIsoWeekYearAndNumber } from "@/lib/server/leaderboard/weeks"
import {
  ProductPlanGrantSource,
  ProductPlanGrantStatus,
} from "@/lib/vendor/prisma/client"
import { projectEffectiveProductPlanGrant } from "@/lib/server/productPlanGrants"
import { enqueueProductPlanGrantBoundaryJobs } from "@/lib/server/productPlanGrantBoundarySchedule"
import { hasAnalyticsIngestionCoverage } from "@/lib/server/analytics/ingestion/coverage"

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

const DAY_MS = 24 * 60 * 60 * 1000
const WINNER_BADGE = "editor-pick"
const WINNER_PLAN_SLUG = process.env.MONTHLY_WINNER_PLAN_SLUG ?? "featured"
const WINNER_BOOST_DAYS = 3

export type PeriodCadence = "day" | "week" | "month"

const PERIOD_BADGE_PREFIX: Record<PeriodCadence, string> = {
  day: "product-of-day",
  week: "product-of-week",
  month: "product-of-month",
}

const MAX_WINNER_BADGE_RANK = 3

type WinnerBadgeAssignment = {
  productId: string
  rank: number
}

type WinnerBadgeRecord = {
  productId: string
  badge: string
  expiresAt: Date
}

function buildWinnerBadgeValue(
  period: PeriodCadence,
  rank: number,
): string | null {
  if (rank < 1 || rank > MAX_WINNER_BADGE_RANK) return null
  const prefix = PERIOD_BADGE_PREFIX[period]
  if (!prefix) return null
  return `${prefix}-${rank}`
}

async function assignWinnerBadges(options: {
  period: PeriodCadence
  periodStart: Date
  periodEnd: Date
  winners: WinnerBadgeAssignment[]
}): Promise<{ assigned: number; products: string[] }> {
  if (!options.winners.length) {
    return { assigned: 0, products: [] }
  }

  const now = new Date()
  const expiresAt = (() => {
    const periodDurationMs = Math.max(
      options.periodEnd.getTime() - options.periodStart.getTime(),
      options.period === "week"
        ? 7 * DAY_MS
        : options.period === "month"
          ? 28 * DAY_MS
          : DAY_MS,
    )
    const currentWindow = getPeriodWindow(options.period, now)
    const anchorEnd =
      options.periodEnd > now ? options.periodEnd : currentWindow.periodEnd

    // Keep winner badges active for a full additional period so they don't expire
    // near the end of the current window (e.g., 5 minutes before midnight).
    return new Date(anchorEnd.getTime() + periodDurationMs)
  })()

  const assignments = options.winners
    .map((winner: WinnerBadgeAssignment) => {
      const badge = buildWinnerBadgeValue(options.period, winner.rank)
      if (!badge) return null
      return {
        productId: winner.productId,
        badge,
        expiresAt,
      }
    })
    .filter((assignment): assignment is WinnerBadgeRecord =>
      Boolean(assignment),
    )

  if (!assignments.length) {
    return { assigned: 0, products: [] }
  }

  const touchedProducts = new Set<string>()

  for (const assignment of assignments) {
    const existing = await prisma.productBadge.findFirst({
      where: {
        productId: assignment.productId,
        badge: assignment.badge,
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.productBadge.update({
        where: { id: existing.id },
        data: { expiresAt: assignment.expiresAt },
      })
    } else {
      await prisma.productBadge.create({
        data: assignment,
      })
    }

    touchedProducts.add(assignment.productId)
  }

  if (touchedProducts.size) {
    touchedProducts.forEach((productId) => revalidateProduct(productId))
    revalidateBadges()
  }

  return { assigned: assignments.length, products: Array.from(touchedProducts) }
}

function getPeriodWindow(
  period: PeriodCadence,
  now: Date = new Date(),
): { periodStart: Date; periodEnd: Date } {
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
    const diff = (day + 6) % 7 // Monday anchor
    const start = new Date(startOfDay)
    start.setUTCDate(startOfDay.getUTCDate() - diff)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    return { periodStart: start, periodEnd: end }
  }

  return getCurrentLeaderboardWindow(now)
}

function getPreviousCompletedPeriodWindow(
  period: Exclude<PeriodCadence, "month">,
  now: Date,
): { periodStart: Date; periodEnd: Date } {
  const currentPeriod = getPeriodWindow(period, now)
  const previousPeriodReference = new Date(
    currentPeriod.periodStart.getTime() - 1,
  )
  const previousPeriod = getPeriodWindow(period, previousPeriodReference)

  return {
    periodStart: previousPeriod.periodStart,
    periodEnd: currentPeriod.periodStart,
  }
}

function formatPeriodLabel(
  period: PeriodCadence,
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

function buildPeriodKey(period: PeriodCadence, periodStart: Date) {
  const year = periodStart.getUTCFullYear()
  const month = String(periodStart.getUTCMonth() + 1).padStart(2, "0")
  const day = String(periodStart.getUTCDate()).padStart(2, "0")
  if (period === "day") {
    return `${year}-${month}-${day}`
  }
  if (period === "week") {
    return `week:${year}-${month}-${day}`
  }
  return `month:${toMonthKey(normalizeMonth(periodStart))}`
}

function getLeaderboardUrl(monthKey: string): string {
  const base = getAppBaseUrl()
  return `${base}${monthlyLeaderboardArchivePath(monthKey)}`
}

function buildPeriodicLeaderboardUrl(
  period: PeriodCadence,
  periodStart: Date,
): string {
  const base = getAppBaseUrl().replace(/\/+$/, "")

  if (period === "day") {
    const year = periodStart.getUTCFullYear()
    const month = periodStart.getUTCMonth() + 1
    const day = periodStart.getUTCDate()
    return `${base}/leaderboard/daily/${year}/${month}/${day}`
  }

  if (period === "week") {
    const { year, week } = getIsoWeekYearAndNumber(periodStart)
    return `${base}/leaderboard/weekly/${year}/${week}`
  }

  const monthKey = toMonthKey(normalizeMonth(periodStart))
  return `${base}${monthlyLeaderboardArchivePath(monthKey)}`
}

type WinnerProduct = {
  id: string
  name: string
  slug: string
  planId: string | null
  planAssignedAt: Date | null
  plan: {
    id: string
    slug: string
    boostForDays: number | null
    isDefault: boolean
  } | null
}

type WinnerEvent = {
  productId: string
  rank: number
  name: string
  slug: string
}

async function resolveWinnerBadgeExpiry(now: Date): Promise<Date | null> {
  const defaultPlan = await prisma.plan.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: "desc" },
    select: { boostForDays: true },
  })

  const boostDays = defaultPlan?.boostForDays
  if (boostDays == null) {
    return new Date(now.getTime() + WINNER_BOOST_DAYS * DAY_MS)
  }
  if (boostDays <= 0) {
    return null
  }

  return new Date(now.getTime() + boostDays * DAY_MS)
}

async function upsertEditorPickBadge(productId: string, now: Date) {
  const desiredExpiresAt = await resolveWinnerBadgeExpiry(now)
  const existing = await prisma.productBadge.findFirst({
    where: { productId, badge: WINNER_BADGE },
    select: { id: true, expiresAt: true },
  })

  if (existing) {
    const currentExpiresAt = existing.expiresAt
    let nextExpiresAt = desiredExpiresAt

    if (
      desiredExpiresAt &&
      currentExpiresAt &&
      currentExpiresAt > desiredExpiresAt
    ) {
      nextExpiresAt = currentExpiresAt
    }

    const hasChanged =
      (nextExpiresAt == null && currentExpiresAt != null) ||
      (nextExpiresAt != null &&
        (!currentExpiresAt ||
          currentExpiresAt.getTime() !== nextExpiresAt.getTime()))

    if (hasChanged) {
      await prisma.productBadge.update({
        where: { id: existing.id },
        data: { expiresAt: nextExpiresAt },
      })
    }
  } else {
    await prisma.productBadge.create({
      data: {
        productId,
        badge: WINNER_BADGE,
        expiresAt: desiredExpiresAt,
      },
    })
  }
}

async function assignWinnerBoostPlan(product: WinnerProduct, now: Date) {
  const minimumExpiry = new Date(now.getTime() + WINNER_BOOST_DAYS * DAY_MS)
  const activeGrant = await prisma.productPlanGrant.findFirst({
    where: {
      productId: product.id,
      status: ProductPlanGrantStatus.active,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    select: { planId: true, expiresAt: true },
  })
  if (!activeGrant?.expiresAt || activeGrant.expiresAt >= minimumExpiry) {
    if (activeGrant) return
  }

  let planId = activeGrant?.planId ?? null
  if (!planId) {
    const fallbackPlan = await prisma.plan.findUnique({
      where: { slug: WINNER_PLAN_SLUG },
      select: { id: true },
    })
    if (!fallbackPlan) return
    planId = fallbackPlan.id
  }

  const projection = await prisma.$transaction(async (tx) => {
    const existingWinnerGrant = await tx.productPlanGrant.findFirst({
      where: {
        productId: product.id,
        source: ProductPlanGrantSource.leaderboard,
        status: ProductPlanGrantStatus.active,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, expiresAt: true },
    })

    if (existingWinnerGrant) {
      if (
        existingWinnerGrant.expiresAt &&
        existingWinnerGrant.expiresAt < minimumExpiry
      ) {
        await tx.productPlanGrant.update({
          where: { id: existingWinnerGrant.id },
          data: { planId, expiresAt: minimumExpiry },
        })
      }
    } else {
      await tx.productPlanGrant.create({
        data: {
          productId: product.id,
          planId,
          source: ProductPlanGrantSource.leaderboard,
          status: ProductPlanGrantStatus.active,
          startsAt: now,
          expiresAt: minimumExpiry,
          metadata: { reason: "monthly-leaderboard-winner" },
        },
      })
    }

    return projectEffectiveProductPlanGrant(tx, product.id, now)
  })
  enqueueProductPlanGrantBoundaryJobs(projection.boundaryJobs)
}

async function grantWinnerPerks(product: WinnerProduct, now: Date) {
  await upsertEditorPickBadge(product.id, now)
  await assignWinnerBoostPlan(product, now)
}

export async function processLeaderboardWinnersForRun(runId: string) {
  const run = await prisma.leaderboardRun.findUnique({
    where: { id: runId },
    select: { id: true, periodStart: true, periodEnd: true },
  })
  if (!run) {
    return {
      processed: 0,
      winners: [],
      alreadyProcessed: false,
      skipped: true,
    }
  }

  const now = new Date()
  if (run.periodEnd > now) {
    return {
      processed: 0,
      winners: [],
      alreadyProcessed: false,
      skipped: true,
    }
  }

  const month = normalizeMonth(run.periodStart)
  const monthKey = toMonthKey(month)
  const monthLabel = monthLabelFormatter.format(month)

  const topThree = await prisma.productLeaderboardScore.findMany({
    where: { runId: run.id },
    orderBy: [{ rank: "asc" }, { score: "desc" }, { upvotes: "desc" }],
    take: 3,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          planId: true,
          planAssignedAt: true,
          plan: {
            select: {
              id: true,
              slug: true,
              boostForDays: true,
              isDefault: true,
            },
          },
        },
      },
    },
  })

  if (!topThree.length) {
    return {
      processed: 0,
      winners: [],
      alreadyProcessed: false,
      skipped: false,
    }
  }

  const topThreeWithRank = topThree.map((entry, index) => ({
    ...entry,
    resolvedRank: entry.rank ?? index + 1,
  }))

  const winnerProduct = topThreeWithRank[0]?.product as
    WinnerProduct | undefined
  if (winnerProduct) {
    await grantWinnerPerks(winnerProduct, now)
  }

  const winnersForEvent = topThreeWithRank
    .map((entry: (typeof topThreeWithRank)[number]): WinnerEvent | null => {
      const product = entry.product as WinnerProduct | undefined
      if (!product) return null
      return {
        productId: product.id,
        rank: entry.resolvedRank,
        name: product.name,
        slug: product.slug,
      }
    })
    .filter((entry: WinnerEvent | null): entry is WinnerEvent => Boolean(entry))

  if (winnersForEvent.length) {
    await assignWinnerBadges({
      period: "month",
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      winners: winnersForEvent.map((winner: WinnerEvent) => ({
        productId: winner.productId,
        rank: winner.rank,
      })),
    })

    dispatchEventAsync(
      "leaderboard.monthly.winners",
      {
        monthKey,
        monthLabel,
        leaderboardUrl: getLeaderboardUrl(monthKey),
        winners: winnersForEvent,
      },
      { context: { monthKey } },
    )
  }

  return {
    processed: winnersForEvent.length,
    winners: winnersForEvent,
    alreadyProcessed: false,
    skipped: false,
  }
}

export async function processLeaderboardPeriodWinners(options: {
  period: PeriodCadence
  limit?: number
  now?: Date
  leaderboardUrl?: string
}) {
  const period = options.period
  const limit = options.limit ?? 3

  if (period === "month") {
    const { periodStart, periodEnd } = getCurrentLeaderboardWindow(
      options.now ?? new Date(),
    )
    const run = await prisma.leaderboardRun.findUnique({
      where: { periodStart_periodEnd: { periodStart, periodEnd } },
      select: { id: true },
    })
    if (!run) {
      return {
        processed: 0,
        winners: [],
        alreadyProcessed: false,
        skipped: true,
        reason: "no-run",
      }
    }
    return processLeaderboardWinnersForRun(run.id)
  }

  const now = options.now ?? new Date()
  const { periodStart, periodEnd } = getPreviousCompletedPeriodWindow(
    period,
    now,
  )
  const periodLabel = formatPeriodLabel(period, periodStart, periodEnd)
  const periodKey = buildPeriodKey(period, periodStart)

  const coverageEnd = new Date(periodEnd.getTime() - DAY_MS)
  const hasTrafficRollup = await hasAnalyticsIngestionCoverage(
    "product_traffic_daily",
    { start: periodStart, end: coverageEnd },
  )
  if (!hasTrafficRollup) {
    return {
      processed: 0,
      winners: [],
      alreadyProcessed: false,
      skipped: true,
      reason: "analytics-pending",
    }
  }

  const winners = await computeLeaderboardWindow({
    periodStart,
    periodEnd,
    asOf: periodEnd,
    limit,
  })
  if (!winners.length) {
    return {
      processed: 0,
      winners: [],
      alreadyProcessed: false,
      skipped: true,
      reason: "no-winners",
    }
  }

  const productIds = winners.map((row) => row.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "published" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })
  type MinimalProduct = (typeof products)[number]
  const productMap = new Map<string, MinimalProduct>(
    products.map((product: MinimalProduct) => [product.id, product]),
  )

  const winnersForEvent = winners
    .map((row) => {
      const product = productMap.get(row.productId)
      if (!product) return null
      return {
        productId: product.id,
        rank: row.rank ?? 0,
        name: product.name,
        slug: product.slug,
      } as WinnerEvent
    })
    .filter((entry): entry is WinnerEvent => Boolean(entry))

  if (!winnersForEvent.length) {
    return {
      processed: 0,
      winners: [],
      alreadyProcessed: false,
      skipped: true,
      reason: "no-products",
    }
  }

  const leaderboardUrl =
    options.leaderboardUrl ??
    buildPeriodicLeaderboardUrl(period, periodStart).replace(/\/+$/, "")

  await assignWinnerBadges({
    period,
    periodStart,
    periodEnd,
    winners: winnersForEvent.map((winner: WinnerEvent) => ({
      productId: winner.productId,
      rank: winner.rank,
    })),
  })

  dispatchEventAsync(
    APP_EVENTS.LEADERBOARD_PERIODIC_WINNERS,
    {
      period,
      periodKey,
      periodLabel,
      leaderboardUrl,
      window: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      winners: winnersForEvent,
    },
    { context: { period, periodKey } },
  )

  return {
    processed: winnersForEvent.length,
    winners: winnersForEvent,
    alreadyProcessed: false,
    skipped: false,
  }
}
