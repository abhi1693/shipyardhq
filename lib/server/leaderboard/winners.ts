import prisma from "@/lib/prisma"
import MonthlyWinnerEmail from "@/lib/email/templates/leaderboard/monthlyWinner"
import { getAppBaseUrl } from "@/lib/email/utils"
import { monthlyLeaderboardArchivePath, productPath } from "@/lib/routes"
import { revalidateBadges, revalidateProduct } from "@/lib/cache/revalidate"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { dispatchEventAsync } from "@/lib/server/events"
import {
  computeLeaderboardWindow,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import { normalizeMonth, toMonthKey } from "@/lib/server/leaderboard/months"
import { getIsoWeekYearAndNumber } from "@/lib/server/leaderboard/weeks"
import { normalizeTwitterHandle } from "@/lib/server/social/shared"
import { sendEmail } from "@/lib/email/resend"
import { sendMonthlyLeaderboardWinnerNotification } from "@/lib/server/notifications/novuLeaderboard"
import {
  broadcastProductOfDayWinnerToNovu,
  broadcastProductOfWeekWinnerToNovu,
  broadcastProductOfMonthWinnerToNovu,
} from "@/lib/server/notifications/novuProduct"

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
  const currentWindow = getPeriodWindow(options.period, now)
  const expiresAt =
    options.periodEnd > now ? options.periodEnd : currentWindow.periodEnd

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

function getProductUrl(slug: string): string {
  const base = getAppBaseUrl()
  return `${base}${productPath(slug)}`
}

type WinnerProduct = {
  id: string
  name: string
  slug: string
  tagline: string | null
  planId: string | null
  planAssignedAt: Date | null
  plan: {
    id: string
    slug: string
    boostForDays: number | null
    isDefault: boolean
  } | null
  user: { email: string | null } | null
  metadata?: { twitterUrl: string | null } | null
}

type WinnerEvent = {
  productId: string
  rank: number
  name: string
  slug: string
  twitterHandle?: string | null
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

  if (product.plan && product.plan.boostForDays && product.planAssignedAt) {
    const currentExpiry = new Date(
      product.planAssignedAt.getTime() + product.plan.boostForDays * DAY_MS,
    )
    if (currentExpiry >= minimumExpiry && !product.plan.isDefault) {
      return
    }
  }

  let planId = product.planId
  let planBoostDays = product.plan?.boostForDays ?? null
  let isDefaultPlan = product.plan?.isDefault ?? true

  if (!planId || isDefaultPlan) {
    const fallbackPlan = await prisma.plan.findUnique({
      where: { slug: WINNER_PLAN_SLUG },
      select: { id: true, boostForDays: true },
    })
    if (!fallbackPlan) return
    planId = fallbackPlan.id
    planBoostDays = fallbackPlan.boostForDays ?? WINNER_BOOST_DAYS
    isDefaultPlan = false
  }

  if (!planId) return

  const boostDays = Math.max(
    planBoostDays ?? WINNER_BOOST_DAYS,
    WINNER_BOOST_DAYS,
  )
  const offsetDays = Math.max(boostDays - WINNER_BOOST_DAYS, 0)
  const planAssignedAt = new Date(now.getTime() - offsetDays * DAY_MS)

  await prisma.product.update({
    where: { id: product.id },
    data: {
      planId,
      planAssignedAt,
    },
  })
}

async function grantWinnerPerks(product: WinnerProduct, now: Date) {
  await upsertEditorPickBadge(product.id, now)
  await assignWinnerBoostPlan(product, now)
}

export async function announceLeaderboardWinnersForRun(runId: string) {
  const run = await prisma.leaderboardRun.findUnique({
    where: { id: runId },
    select: { id: true, periodStart: true, periodEnd: true },
  })
  if (!run) {
    return {
      notified: 0,
      recipients: [],
      alreadyNotified: false,
      skipped: true,
    }
  }

  const now = new Date()
  if (run.periodEnd > now) {
    return {
      notified: 0,
      recipients: [],
      alreadyNotified: false,
      skipped: true,
    }
  }

  const month = normalizeMonth(run.periodStart)
  const monthKey = toMonthKey(month)
  const monthLabel = monthLabelFormatter.format(month)

  const existingNotification =
    await prisma.monthlyLeaderboardNotification.findUnique({
      where: { month },
    })
  if (existingNotification) {
    return {
      notified: 0,
      recipients: [],
      alreadyNotified: true,
      skipped: false,
    }
  }

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
          tagline: true,
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
          user: {
            select: {
              email: true,
            },
          },
          metadata: {
            select: {
              twitterUrl: true,
            },
          },
        },
      },
    },
  })

  if (!topThree.length) {
    return {
      notified: 0,
      recipients: [],
      alreadyNotified: false,
      skipped: false,
    }
  }

  const recipients: string[] = []

  for (const entry of topThree) {
    const product = entry.product as WinnerProduct | null
    const email = product?.user?.email
    if (!product || !email) continue

    const leaderboardUrl = getLeaderboardUrl(monthKey)
    const productUrl = getProductUrl(product.slug)
    let delivered = false

    try {
      await sendMonthlyLeaderboardWinnerNotification({
        recipient: {
          subscriberId: product.user?.email?.toLowerCase() ?? email,
          email,
        },
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        monthKey,
        monthLabel,
        rank: entry.rank,
        topThree: topThree.map((winner: (typeof topThree)[number]) => ({
          rank: winner.rank,
          productId: (winner.product as WinnerProduct).id,
          productSlug: (winner.product as WinnerProduct).slug,
          productName: (winner.product as WinnerProduct).name,
        })),
        leaderboardUrl,
        productUrl,
      })
      delivered = true
    } catch (error) {
      console.error("[novu] leaderboard winner notification failed", {
        email,
        productId: product.id,
        error,
      })
    }

    try {
      await sendEmail({
        to: email,
        subject: `${product.name} ranked #${entry.rank} in ${monthLabel}`,
        react: MonthlyWinnerEmail({
          productName: product.name,
          monthLabel,
          rank: entry.rank,
          productUrl,
          leaderboardUrl,
        }),
      })
      delivered = true
    } catch (error) {
      console.error("[email] leaderboard winner email failed", {
        email,
        productId: product.id,
        error,
      })
    }

    if (delivered) {
      recipients.push(email)
    }
  }

  const winnerProduct = topThree[0]?.product as WinnerProduct | undefined
  if (winnerProduct) {
    await grantWinnerPerks(winnerProduct, now)
  }

  const winnersForEvent = topThree
    .map((entry: (typeof topThree)[number]): WinnerEvent | null => {
      const product = entry.product as WinnerProduct | undefined
      if (!product) return null
      return {
        productId: product.id,
        rank: entry.rank,
        name: product.name,
        slug: product.slug,
        twitterHandle: normalizeTwitterHandle(product.metadata?.twitterUrl),
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

    const topWinner = topThree[0]?.product as WinnerProduct | undefined
    if (topWinner) {
      const broadcast = await broadcastProductOfMonthWinnerToNovu({
        periodKey: monthKey,
        periodLabel: monthLabel,
        leaderboardUrl: getLeaderboardUrl(monthKey),
        product: {
          id: topWinner.id,
          slug: topWinner.slug,
          name: topWinner.name,
          tagline: topWinner.tagline ?? "",
        },
      })

      console.info("[novu] product of the month broadcast", {
        periodKey: monthKey,
        sent: broadcast.sent,
        total: broadcast.total,
        reason: broadcast.reason,
      })
    }
  }

  await prisma.monthlyLeaderboardNotification.create({
    data: { month },
  })

  return {
    notified: recipients.length,
    recipients,
    alreadyNotified: false,
    skipped: false,
  }
}

export async function announceLeaderboardPeriodWinners(options: {
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
        notified: 0,
        winners: [],
        alreadyNotified: false,
        skipped: true,
        reason: "no-run",
      }
    }
    return announceLeaderboardWinnersForRun(run.id)
  }

  const now = options.now ?? new Date()
  const { periodStart, periodEnd } = getPeriodWindow(period, now)
  const periodLabel = formatPeriodLabel(period, periodStart, periodEnd)
  const periodKey = buildPeriodKey(period, periodStart)

  const winners = await computeLeaderboardWindow({
    periodStart,
    periodEnd,
    asOf: now,
    limit,
  })
  if (!winners.length) {
    return {
      notified: 0,
      winners: [],
      alreadyNotified: false,
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
      tagline: true,
      metadata: { select: { twitterUrl: true } },
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
        twitterHandle: normalizeTwitterHandle(product.metadata?.twitterUrl),
      } as WinnerEvent
    })
    .filter((entry): entry is WinnerEvent => Boolean(entry))

  if (!winnersForEvent.length) {
    return {
      notified: 0,
      winners: [],
      alreadyNotified: false,
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

  if (period === "day") {
    const productOfDay = winnersForEvent.find((winner) => winner.rank === 1)
    if (productOfDay) {
      const productDetails = productMap.get(productOfDay.productId)
      const broadcast = await broadcastProductOfDayWinnerToNovu({
        periodKey,
        periodLabel,
        leaderboardUrl,
        product: {
          id: productOfDay.productId,
          slug: productOfDay.slug,
          name: productOfDay.name,
          tagline: productDetails?.tagline ?? "",
        },
      })
      console.info("[novu] product of the day broadcast", {
        periodKey,
        sent: broadcast.sent,
        total: broadcast.total,
        reason: broadcast.reason,
      })
    }
  }

  if (period === "week") {
    const productOfWeek = winnersForEvent.find((winner) => winner.rank === 1)
    if (productOfWeek) {
      const productDetails = productMap.get(productOfWeek.productId)
      const broadcast = await broadcastProductOfWeekWinnerToNovu({
        periodKey,
        periodLabel,
        leaderboardUrl,
        product: {
          id: productOfWeek.productId,
          slug: productOfWeek.slug,
          name: productOfWeek.name,
          tagline: productDetails?.tagline ?? "",
        },
      })
      console.info("[novu] product of the week broadcast", {
        periodKey,
        sent: broadcast.sent,
        total: broadcast.total,
        reason: broadcast.reason,
      })
    }
  }

  return {
    notified: winnersForEvent.length,
    winners: winnersForEvent,
    alreadyNotified: false,
    skipped: false,
  }
}
