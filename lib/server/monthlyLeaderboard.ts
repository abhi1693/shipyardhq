import { Prisma } from "@/lib/vendor/prisma/client"
import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import { publish } from "@/lib/server/events"
import "@/lib/server/social/twitterBot"
import { extractTwitterHandle } from "@/lib/server/social/twitterMessages"
import MonthlyWinnerEmail from "@/lib/email/templates/leaderboard/monthlyWinner"
import { getAppBaseUrl } from "@/lib/email/utils"
import { monthlyLeaderboardArchivePath, productPath } from "@/lib/routes"

const MONTH_PARAM = /^(\d{2})-(\d{2})-(\d{4})$/
const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const DAY_MS = 24 * 60 * 60 * 1000
const WINNER_BADGE = "editor-pick"
const WINNER_PLAN_SLUG = process.env.MONTHLY_WINNER_PLAN_SLUG ?? "featured"
const WINNER_BOOST_DAYS = 3

export function normalizeMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function getPreviousMonth(reference: Date = new Date()): Date {
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth()
  const previousMonth = month === 0 ? 11 : month - 1
  const previousYear = month === 0 ? year - 1 : year
  return new Date(Date.UTC(previousYear, previousMonth, 1))
}

function toMonthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

export function parseMonthKey(value?: string): Date | null {
  if (!value) return null
  const match = value.match(MONTH_PARAM)
  if (!match) return null
  const day = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const year = Number(match[3])
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(year)
  ) {
    return null
  }
  if (monthIndex < 0 || monthIndex > 11) return null
  const candidate = new Date(Date.UTC(year, monthIndex, day))
  if (candidate.getUTCFullYear() !== year) return null
  if (candidate.getUTCMonth() !== monthIndex) return null
  if (candidate.getUTCDate() !== day) return null
  const monthEnd = toMonthEnd(new Date(Date.UTC(year, monthIndex, 1)))
  if (candidate.getTime() !== monthEnd.getTime()) return null
  return normalizeMonth(candidate)
}

export function toMonthKey(date: Date): string {
  const monthStart = normalizeMonth(date)
  const monthEnd = toMonthEnd(monthStart)
  const day = String(monthEnd.getUTCDate()).padStart(2, "0")
  const month = String(monthEnd.getUTCMonth() + 1).padStart(2, "0")
  const year = monthEnd.getUTCFullYear()
  return `${day}-${month}-${year}`
}

type GenerateMonthlyLeaderboardOptions = {
  month?: Date
  now?: Date
  limit?: number
}

type MonthlyUpvoteGroup = Pick<
  Prisma.ProductUpvoteGroupByOutputType,
  "productId" | "_count"
>

export type MonthlyRankingSummary = {
  productId: string
  rank: number
  upvotes: number
  score: number
}

export type GenerateMonthlyLeaderboardResult = {
  month: Date
  monthKey: string
  start: Date
  end: Date
  limit: number
  count: number
  rankings: MonthlyRankingSummary[]
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

export async function generateMonthlyLeaderboard(
  options: GenerateMonthlyLeaderboardOptions = {},
): Promise<GenerateMonthlyLeaderboardResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const reference = options.month
    ? normalizeMonth(options.month)
    : getPreviousMonth(options.now)
  const monthStart = normalizeMonth(reference)
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
  )
  const monthKey = toMonthKey(monthStart)

  const grouped = (await prisma.productUpvote.groupBy({
    by: ["productId"],
    where: {
      createdAt: {
        gte: monthStart,
        lt: monthEnd,
      },
      product: {
        status: "published",
      },
    },
    _count: { productId: true },
    orderBy: [{ _count: { productId: "desc" } }, { productId: "asc" }],
    take: limit,
  })) as MonthlyUpvoteGroup[]

  if (!grouped.length) {
    await prisma.monthlyProductRanking.deleteMany({
      where: { month: monthStart },
    })
    return {
      month: monthStart,
      monthKey,
      start: monthStart,
      end: monthEnd,
      limit,
      count: 0,
      rankings: [],
    }
  }

  const productIds = grouped.map((entry) => entry.productId)
  const analytics = await prisma.productAnalytics.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, upvotes: true },
  })
  const analyticsMap = new Map(
    analytics.map((item) => [item.productId, item.upvotes ?? 0]),
  )

  const rankings = grouped.map((entry, index) => {
    const monthlyUpvotes = entry._count?.productId ?? 0
    const totalUpvotes = analyticsMap.get(entry.productId) ?? 0
    const score = monthlyUpvotes * 100 + totalUpvotes

    return {
      productId: entry.productId,
      rank: index + 1,
      upvotes: monthlyUpvotes,
      score,
    }
  })

  const createdCount = await prisma.$transaction(async (tx) => {
    await tx.monthlyProductRanking.deleteMany({ where: { month: monthStart } })
    const createResult = await tx.monthlyProductRanking.createMany({
      data: rankings.map((ranking) => ({
        month: monthStart,
        productId: ranking.productId,
        rank: ranking.rank,
        score: ranking.score,
        upvotes: ranking.upvotes,
      })),
    })
    return createResult.count
  })

  return {
    month: monthStart,
    monthKey,
    start: monthStart,
    end: monthEnd,
    limit,
    count: createdCount,
    rankings,
  }
}

function getLeaderboardUrl(monthKey: string): string {
  const base = getAppBaseUrl()
  return `${base}${monthlyLeaderboardArchivePath(monthKey)}`
}

function getProductUrl(slug: string): string {
  const base = getAppBaseUrl()
  return `${base}${productPath(slug)}`
}

async function createNotificationRecord(month: Date) {
  try {
    await prisma.monthlyLeaderboardNotification.create({ data: { month } })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return
    }
    throw error
  }
}

async function upsertEditorPickBadge(productId: string, now: Date) {
  const newExpiresAt = new Date(now.getTime() + WINNER_BOOST_DAYS * DAY_MS)
  const existing = await prisma.productBadge.findFirst({
    where: { productId, badge: WINNER_BADGE },
    select: { id: true, expiresAt: true },
  })

  if (existing) {
    const currentExpiresAt = existing.expiresAt
    const nextExpiresAt =
      currentExpiresAt && currentExpiresAt > newExpiresAt
        ? currentExpiresAt
        : newExpiresAt

    if (
      !currentExpiresAt ||
      currentExpiresAt.getTime() !== nextExpiresAt.getTime()
    ) {
      await prisma.productBadge.update({
        where: { id: existing.id },
        data: { expiresAt: nextExpiresAt },
      })
    }
  } else {
    await prisma.productBadge.create({
      data: { productId, badge: WINNER_BADGE, expiresAt: newExpiresAt },
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

export async function notifyMonthlyWinners(
  result: GenerateMonthlyLeaderboardResult,
): Promise<{
  notified: number
  recipients: string[]
  alreadyNotified: boolean
}> {
  if (!result.rankings.length) {
    return { notified: 0, recipients: [], alreadyNotified: false }
  }

  const existingNotification =
    await prisma.monthlyLeaderboardNotification.findUnique({
      where: { month: result.month },
    })

  if (existingNotification) {
    return { notified: 0, recipients: [], alreadyNotified: true }
  }

  const topThree = result.rankings.slice(0, 3)
  if (!topThree.length) {
    return { notified: 0, recipients: [], alreadyNotified: false }
  }

  const products = await prisma.product.findMany({
    where: { id: { in: topThree.map((ranking) => ranking.productId) } },
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
  })

  const productMap = new Map<string, WinnerProduct>(
    products.map((product) => [product.id, product as WinnerProduct]),
  )
  const leaderboardUrl = getLeaderboardUrl(result.monthKey)
  const monthLabel = monthLabelFormatter.format(result.month)

  const recipients: string[] = []
  const now = new Date()

  for (const ranking of topThree) {
    const product = productMap.get(ranking.productId)
    const email = product?.user?.email
    if (!product || !email) continue

    await sendEmail({
      to: email,
      subject: `${product.name} ranked #${ranking.rank} in ${monthLabel}`,
      react: MonthlyWinnerEmail({
        productName: product.name,
        monthLabel,
        rank: ranking.rank,
        productUrl: getProductUrl(product.slug),
        leaderboardUrl,
      }),
    })
    recipients.push(email)
  }

  const winnerProduct = topThree[0]
  if (winnerProduct) {
    const product = productMap.get(winnerProduct.productId)
    if (product) {
      await grantWinnerPerks(product, now)
    }
  }

  const winnersForEvent = topThree
    .map((ranking) => {
      const product = productMap.get(ranking.productId)
      if (!product) return null
      return {
        productId: product.id,
        rank: ranking.rank,
        name: product.name,
        slug: product.slug,
        twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  if (winnersForEvent.length) {
    await publish("leaderboard.monthly.winners", {
      monthKey: result.monthKey,
      monthLabel,
      leaderboardUrl,
      winners: winnersForEvent,
    })
  }

  await createNotificationRecord(result.month)

  return { notified: recipients.length, recipients, alreadyNotified: false }
}
