import { TriggerRecipientsTypeEnum } from "@novu/api/models/components/triggerrecipientstypeenum"

import { productPath } from "@/lib/routes"
import {
  getNovuClient,
  guardNovuWorkflow,
  normalizeNovuString,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { NOVU_BROADCAST_TOPIC_KEY } from "@/lib/server/notifications/novuBroadcast"
import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"

const NOVU_RECOMMENDATIONS_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_RECOMMENDATIONS?.trim() ?? null

type ProductOfPeriodBroadcastReason =
  | "novu-disabled"
  | "missing-workflow"
  | "send-failed"

type ProductOfPeriodBroadcastResult = {
  sent: number
  total: number
  reason: ProductOfPeriodBroadcastReason | null
}

export type ProductNotificationKind =
  | "product_upvote"
  | "product_review"
  | "product_published"
  | "product_insights_ready"
  | "product_payment_sync_error"
  | "product_featured"
  | "product_of_day"
  | "product_of_week"
  | "product_of_month"

export type ProductNotificationPayload = {
  kind: ProductNotificationKind
  message: string
  subject: string
  recipient: NovuSubscriberInput
  product: {
    id: string
    slug?: string | null
    name?: string | null
  }
  context?: Record<string, unknown>
  actor?: NovuSubscriberInput | null
  transactionId?: string
  links?: {
    member?: string | null
    public?: string | null
  }
  tags?: string[]
}

export async function sendProductNotificationToNovu(
  payload: ProductNotificationPayload,
): Promise<void> {
  const workflow = guardNovuWorkflow(NOVU_RECOMMENDATIONS_WORKFLOW_ID, {
    label: "recommendations notifications",
    missingMessage: "[novu] NOVU_WORKFLOW_RECOMMENDATIONS is not set",
  })
  if (!workflow.ready) return

  const { recipient, actor, ...rest } = payload

  try {
    const siteUrl = resolveSiteUrl()
    const transactionId =
      payload.transactionId ??
      `${payload.kind}:${payload.product.id}:${Date.now()}`
    const subject =
      normalizeNovuString(rest.subject) ??
      normalizeNovuString(rest.message) ??
      `${siteConfig.name} update`

    const rawMemberLink = normalizeNovuString(rest.links?.member)
    const rawPublicLink =
      normalizeNovuString(rest.links?.public) ??
      normalizeNovuString(rest.links?.member)

    const memberLink = rawMemberLink
      ? new URL(rawMemberLink, `${siteUrl}/`).toString()
      : null

    const publicLink = rawPublicLink
      ? new URL(rawPublicLink, `${siteUrl}/`).toString()
      : siteUrl

    const actorPayload = actor
      ? {
          id: actor.subscriberId,
          firstName: normalizeNovuString(actor.firstName) ?? undefined,
          lastName: normalizeNovuString(actor.lastName) ?? undefined,
          email: normalizeNovuString(actor.email),
        }
      : undefined

    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber: recipient,
      actor: actor ?? undefined,
      transactionId,
      ensureActor: Boolean(actor),
      payload: {
        notification: {
          kind: rest.kind,
          message: rest.message,
          timestamp: new Date().toISOString(),
          transactionId,
          subject,
        },
        product: rest.product,
        ...(actorPayload ? { actor: actorPayload } : {}),
        links: {
          member: memberLink,
          public: publicLink,
        },
        context: rest.context ?? {},
        tags: rest.tags ?? ["product-notifications"],
      },
    })
  } catch (error) {
    console.error("[novu] failed to send product notification", {
      error,
      kind: payload.kind,
      recipientId: recipient.subscriberId,
    })
  }
}

type PeriodicWinnerBroadcastInput = {
  period: "day" | "week" | "month"
  periodKey: string
  periodLabel: string
  leaderboardUrl: string
  product: { id: string; slug: string; name: string; tagline: string }
}

type FeaturedProductBroadcastInput = {
  product: { id: string; slug: string; name: string; tagline?: string | null }
}

async function broadcastPeriodicWinnerToNovu(
  input: PeriodicWinnerBroadcastInput,
): Promise<ProductOfPeriodBroadcastResult> {
  const workflow = guardNovuWorkflow(NOVU_RECOMMENDATIONS_WORKFLOW_ID, {
    label: "recommendations notifications",
    missingMessage: "[novu] NOVU_WORKFLOW_RECOMMENDATIONS is not set",
  })
  if (!workflow.ready) {
    return { sent: 0, total: 0, reason: workflow.reason }
  }

  const siteUrl = resolveSiteUrl()
  const productUrl = new URL(
    productPath(input.product.slug),
    `${siteUrl}/`,
  ).toString()
  const transactionPrefix = `product_of_${input.period}:${input.product.id}:${input.periodKey}`
  const timestamp = new Date().toISOString()
  const subject =
    input.period === "week"
      ? `Product of the Week: ${input.product.name}`
      : input.period === "month"
        ? `Product of the Month: ${input.product.name}`
        : `Product of the Day: ${input.product.name}`
  const message =
    normalizeNovuString(input.product.tagline) ?? input.product.tagline

  try {
    const client = getNovuClient()
    await client.trigger({
      workflowId: workflow.workflowId,
      to: {
        type: TriggerRecipientsTypeEnum.Topic,
        topicKey: NOVU_BROADCAST_TOPIC_KEY,
      },
      payload: {
        notification: {
          kind:
            input.period === "week"
              ? "product_of_week"
              : input.period === "month"
                ? "product_of_month"
                : "product_of_day",
          message,
          subject,
          timestamp,
          transactionId: transactionPrefix,
        },
        product: {
          id: input.product.id,
          slug: input.product.slug,
          name: input.product.name,
        },
        links: {
          member: productUrl,
          public: productUrl,
        },
        context: {
          leaderboard_periodic_winner: {
            period: input.period,
            periodKey: input.periodKey,
            periodLabel: input.periodLabel,
            rank: 1,
            leaderboardUrl: input.leaderboardUrl,
          },
        },
        tags: ["discover"],
      },
    })

    return { sent: 1, total: 1, reason: null }
  } catch (error) {
    console.error(`[novu] failed to broadcast product of the ${input.period}`, {
      error,
      topicKey: NOVU_BROADCAST_TOPIC_KEY,
      productId: input.product.id,
      periodKey: input.periodKey,
    })

    return { sent: 0, total: 0, reason: "send-failed" }
  }
}

export async function broadcastFeaturedProductActivationToNovu(
  input: FeaturedProductBroadcastInput,
): Promise<ProductOfPeriodBroadcastResult> {
  const workflow = guardNovuWorkflow(NOVU_RECOMMENDATIONS_WORKFLOW_ID, {
    label: "recommendations notifications",
    missingMessage: "[novu] NOVU_WORKFLOW_RECOMMENDATIONS is not set",
  })
  if (!workflow.ready) {
    return { sent: 0, total: 0, reason: workflow.reason }
  }

  const siteUrl = resolveSiteUrl()
  const productUrl = new URL(
    productPath(input.product.slug),
    `${siteUrl}/`,
  ).toString()

  const timestamp = new Date().toISOString()
  const transactionId = `product_featured:${input.product.id}:${timestamp}`
  const subject = `Featured spotlight: ${input.product.name}`
  const message =
    normalizeNovuString(input.product.tagline ?? "")

  try {
    const client = getNovuClient()
    await client.trigger({
      workflowId: workflow.workflowId,
      to: {
        type: TriggerRecipientsTypeEnum.Topic,
        topicKey: NOVU_BROADCAST_TOPIC_KEY,
      },
      payload: {
        notification: {
          kind: "product_featured",
          message,
          subject,
          timestamp,
          transactionId,
        },
        product: {
          id: input.product.id,
          slug: input.product.slug,
          name: input.product.name,
        },
        links: {
          member: productUrl,
          public: productUrl,
        },
        context: {
          featured_product: {
            productId: input.product.id,
          },
        },
        tags: ["discover"],
      },
    })

    return { sent: 1, total: 1, reason: null }
  } catch (error) {
    console.error("[novu] failed to broadcast featured product", {
      error,
      topicKey: NOVU_BROADCAST_TOPIC_KEY,
      productId: input.product.id,
    })

    return { sent: 0, total: 0, reason: "send-failed" }
  }
}

export async function broadcastProductOfDayWinnerToNovu(input: {
  periodKey: string
  periodLabel: string
  leaderboardUrl: string
  product: { id: string; slug: string; name: string; tagline: string }
}): Promise<ProductOfPeriodBroadcastResult> {
  return broadcastPeriodicWinnerToNovu({ ...input, period: "day" })
}

export async function broadcastProductOfWeekWinnerToNovu(input: {
  periodKey: string
  periodLabel: string
  leaderboardUrl: string
  product: { id: string; slug: string; name: string; tagline: string }
}): Promise<ProductOfPeriodBroadcastResult> {
  return broadcastPeriodicWinnerToNovu({ ...input, period: "week" })
}

export async function broadcastProductOfMonthWinnerToNovu(input: {
  periodKey: string
  periodLabel: string
  leaderboardUrl: string
  product: { id: string; slug: string; name: string; tagline: string }
}): Promise<ProductOfPeriodBroadcastResult> {
  return broadcastPeriodicWinnerToNovu({ ...input, period: "month" })
}
