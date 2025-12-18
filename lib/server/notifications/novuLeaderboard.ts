import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { monthlyLeaderboardArchivePath, productPath } from "@/lib/routes"

const NOVU_LEADERBOARD_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PRODUCT_NOTIFICATIONS?.trim() ?? null

type WeeklyMicroLeaderboardNotification = {
  weekKey: string
  category: {
    id: string
    name: string
    slug: string
  }
  rank: number
  leaderboardUrl: string
  product: {
    id: string
    name: string
    slug: string
  }
}

type LeaderboardWinnerNotification = {
  monthKey: string
  monthLabel: string
  leaderboardUrl: string
  topThree?: Array<{
    rank: number
    productId: string
    productName: string
    productSlug: string
  }>
}

export async function sendMonthlyLeaderboardWinnerNotification(input: {
  recipient: NovuSubscriberInput
  productId: string
  productSlug: string
  productName: string
  monthKey: string
  monthLabel: string
  rank: number
  topThree?: Array<{
    rank: number
    productId: string
    productName: string
    productSlug: string
  }>
  leaderboardUrl?: string
  productUrl?: string
}): Promise<void> {
  const workflow = guardNovuWorkflow(NOVU_LEADERBOARD_WORKFLOW_ID, {
    label: "leaderboard notifications",
    missingMessage: "[novu] leaderboard workflow id not configured",
  })
  if (!workflow.ready) return

  const subscriberId = input.recipient.subscriberId?.trim()
  if (!subscriberId) {
    console.warn("[novu] leaderboard winner missing subscriber id", {
      productId: input.productId,
    })
    return
  }

  const siteUrl = resolveSiteUrl()
  const leaderboardUrl =
    input.leaderboardUrl ||
    new URL(
      monthlyLeaderboardArchivePath(input.monthKey),
      `${siteUrl}/`,
    ).toString()
  const productUrl =
    input.productUrl ||
    new URL(productPath(input.productSlug), `${siteUrl}/`).toString()
  const timestamp = new Date().toISOString()

  const message = `${input.productName} ranked #${input.rank} in ${input.monthLabel}`
  const subject = `${input.productName} ranked #${input.rank} in ${input.monthLabel}`

  const payload: LeaderboardWinnerNotification = {
    monthKey: input.monthKey,
    monthLabel: input.monthLabel,
    leaderboardUrl,
    topThree: input.topThree,
  }

  try {
    const subscriber = { ...input.recipient, subscriberId }

    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "leaderboard_monthly_winner",
          message,
          subject,
          timestamp,
        },
        links: {
          member: productUrl,
          public: productUrl,
        },
        context: {
          leaderboard_monthly_winner: {
            monthKey: payload.monthKey,
            monthLabel: payload.monthLabel,
            leaderboardUrl: payload.leaderboardUrl,
            rank_1:
              payload.topThree?.find((winner) => winner.rank === 1) ?? null,
            rank_2:
              payload.topThree?.find((winner) => winner.rank === 2) ?? null,
            rank_3:
              payload.topThree?.find((winner) => winner.rank === 3) ?? null,
          },
        },
        tags: ["leaderboard", "winner"],
      },
      transactionId: `leaderboard_monthly_winner:${input.productId}:${input.monthKey}:${timestamp}`,
    })
  } catch (error) {
    console.error("[novu] failed to send leaderboard winner notification", {
      error,
      productId: input.productId,
      monthKey: input.monthKey,
    })
  }
}

export async function sendWeeklyMicroLeaderboardNudgeNotification(input: {
  recipient: NovuSubscriberInput
  productId: string
  productSlug: string
  productName: string
  weekKey: string
  category: {
    id: string
    name: string
    slug: string
  }
  rank: number
  leaderboardUrl: string
  productUrl?: string
}): Promise<void> {
  const workflow = guardNovuWorkflow(NOVU_LEADERBOARD_WORKFLOW_ID, {
    label: "leaderboard notifications",
    missingMessage: "[novu] leaderboard workflow id not configured",
  })
  if (!workflow.ready) return

  const subscriberId = input.recipient.subscriberId?.trim()
  if (!subscriberId) {
    console.warn("[novu] leaderboard weekly nudge missing subscriber id", {
      productId: input.productId,
      weekKey: input.weekKey,
    })
    return
  }

  const siteUrl = resolveSiteUrl()
  const productUrl =
    input.productUrl ||
    new URL(productPath(input.productSlug), `${siteUrl}/`).toString()
  const timestamp = new Date().toISOString()

  const subject = "You are close to the top"
  const message = `Your product is currently ranked #${input.rank} in ${input.category.name} this week.\n\nTop products receive extra visibility and rewards.\n\nA small push can move you higher.`

  const payload: WeeklyMicroLeaderboardNotification = {
    weekKey: input.weekKey,
    category: input.category,
    rank: input.rank,
    leaderboardUrl: input.leaderboardUrl,
    product: {
      id: input.productId,
      slug: input.productSlug,
      name: input.productName,
    },
  }

  try {
    const subscriber = { ...input.recipient, subscriberId }

    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "leaderboard_weekly_nudge",
          message,
          subject,
          timestamp,
        },
        links: {
          member: input.leaderboardUrl,
          public: input.leaderboardUrl,
        },
        context: {
          leaderboard_weekly_nudge: {
            weekKey: payload.weekKey,
            rank: payload.rank,
            leaderboardUrl: payload.leaderboardUrl,
            category: payload.category,
            product: payload.product,
            productUrl,
            cta: {
              label: "View leaderboard",
              url: payload.leaderboardUrl,
            },
          },
        },
        tags: ["leaderboard"],
      },
      transactionId: `leaderboard_weekly_nudge:${input.productId}:${input.weekKey}:${input.category.id}`,
    })
  } catch (error) {
    console.error("[novu] failed to send leaderboard weekly nudge", {
      error,
      productId: input.productId,
      weekKey: input.weekKey,
    })
  }
}
