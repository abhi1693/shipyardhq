import prisma from "@/lib/prisma"
import MonthlyWinnerEmail from "@/lib/email/templates/leaderboard/monthlyWinner"
import { getAppBaseUrl } from "@/lib/email/utils"
import { monthlyLeaderboardArchivePath, productPath } from "@/lib/routes"
import { dispatchEventAsync } from "@/lib/server/events"
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
    return { notified: 0, recipients: [], alreadyNotified: false, skipped: true }
  }

  const now = new Date()
  if (run.periodEnd > now) {
    return { notified: 0, recipients: [], alreadyNotified: false, skipped: true }
  }

  const month = normalizeMonth(run.periodStart)
  const monthKey = toMonthKey(month)
  const monthLabel = monthLabelFormatter.format(month)

  const existingNotification =
    await prisma.monthlyLeaderboardNotification.findUnique({
      where: { month },
    })
  if (existingNotification) {
    return { notified: 0, recipients: [], alreadyNotified: true, skipped: false }
  }

  const topThree = await prisma.productLeaderboardScore.findMany({
    where: { runId: run.id },
    orderBy: [
      { rank: "asc" },
      { score: "desc" },
      { upvotes: "desc" },
    ],
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
    return { notified: 0, recipients: [], alreadyNotified: false, skipped: false }
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
