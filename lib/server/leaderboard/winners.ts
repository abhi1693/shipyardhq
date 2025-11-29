import prisma from "@/lib/prisma"
import MonthlyWinnerEmail from "@/lib/email/templates/leaderboard/monthlyWinner"
import { getAppBaseUrl } from "@/lib/email/utils"
import {
  LEADERBOARD_PATH,
  monthlyLeaderboardArchivePath,
  productPath,
} from "@/lib/routes"
import { revalidateBadges, revalidateProduct } from "@/lib/cache/revalidate"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { dispatchEventAsync } from "@/lib/server/events"
import {
  computeLeaderboardWindow,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import {
  grantWinnerPerks,
  normalizeMonth,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"
import { extractTwitterHandle } from "@/lib/server/social/twitterMessages"
import { sendEmail } from "@/lib/email/resend"

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

function getProductUrl(slug: string): string {
  const base = getAppBaseUrl()
  return `${base}${productPath(slug)}`
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

    await sendEmail({
      to: email,
      subject: `${product.name} ranked #${entry.rank} in ${monthLabel}`,
      react: MonthlyWinnerEmail({
        productName: product.name,
        monthLabel,
        rank: entry.rank,
        productUrl: getProductUrl(product.slug),
        leaderboardUrl: getLeaderboardUrl(monthKey),
      }),
    })
    recipients.push(email)
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
        twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
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

    await dispatchEventAsync(
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

  const rankedRows = await computeLeaderboardWindow({
    periodStart,
    periodEnd,
    asOf: now,
  })
  const winners = rankedRows.slice(0, limit)
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
        twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
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

  await assignWinnerBadges({
    period,
    periodStart,
    periodEnd,
    winners: winnersForEvent.map((winner: WinnerEvent) => ({
      productId: winner.productId,
      rank: winner.rank,
    })),
  })

  await dispatchEventAsync(
    APP_EVENTS.LEADERBOARD_PERIODIC_WINNERS,
    {
      period,
      periodKey,
      periodLabel,
      leaderboardUrl:
        options.leaderboardUrl ??
        `${getAppBaseUrl()}${LEADERBOARD_PATH}`.replace(/\/+$/, ""),
      window: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      winners: winnersForEvent,
    },
    { context: { period, periodKey } },
  )

  return {
    notified: winnersForEvent.length,
    winners: winnersForEvent,
    alreadyNotified: false,
    skipped: false,
  }
}
