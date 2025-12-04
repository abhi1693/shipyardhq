import { productPath } from "@/lib/routes"
import {
  fetchNovuSubscriberIds,
  guardNovuWorkflow,
  normalizeNovuString,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"

const NOVU_RECOMMENDATIONS_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_RECOMMENDATIONS?.trim() ?? null

type ProductOfDayBroadcastReason =
  | "novu-disabled"
  | "missing-workflow"
  | "no-subscribers"
  | "send-failed"

type ProductOfDayBroadcastResult = {
  sent: number
  total: number
  reason: ProductOfDayBroadcastReason | null
}

export type ProductNotificationKind =
  | "product_upvote"
  | "product_review"
  | "product_published"
  | "product_insights_ready"
  | "product_payment_sync_error"
  | "product_of_day"

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

const PRODUCT_OF_DAY_RATE_LIMIT_PER_SECOND = 3
const PRODUCT_OF_DAY_WINDOW_MS = 1000

type ThrottleState = { count: number; windowStart: number }

async function fetchExistingNovuSubscriberIds(): Promise<string[]> {
  const ids = await fetchNovuSubscriberIds()
  return ids
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id))
}

async function throttleProductOfDayRate(
  state: ThrottleState,
): Promise<ThrottleState> {
  const now = Date.now()
  const elapsed = now - state.windowStart

  if (elapsed >= PRODUCT_OF_DAY_WINDOW_MS) {
    return { count: 1, windowStart: now }
  }

  if (state.count >= PRODUCT_OF_DAY_RATE_LIMIT_PER_SECOND) {
    const waitMs = PRODUCT_OF_DAY_WINDOW_MS - elapsed
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return { count: 1, windowStart: Date.now() }
  }

  return { count: state.count + 1, windowStart: state.windowStart }
}

export async function broadcastProductOfDayWinnerToNovu(input: {
  periodKey: string
  periodLabel: string
  leaderboardUrl: string
  product: { id: string; slug: string; name: string; tagline: string }
}): Promise<ProductOfDayBroadcastResult> {
  const workflow = guardNovuWorkflow(NOVU_RECOMMENDATIONS_WORKFLOW_ID, {
    label: "recommendations notifications",
    missingMessage: "[novu] NOVU_WORKFLOW_RECOMMENDATIONS is not set",
  })
  if (!workflow.ready) {
    return { sent: 0, total: 0, reason: workflow.reason }
  }

  // We assume subscribers already exist in Novu and subscriberId === userId.
  // Provide a minimal list here (e.g., seeded externally) to avoid creating new ones.
  const subscriberIds = await fetchExistingNovuSubscriberIds()
  if (!subscriberIds.length) {
    console.warn("[novu] product of the day broadcast has no subscribers")
    return { sent: 0, total: 0, reason: "no-subscribers" }
  }

  const siteUrl = resolveSiteUrl()
  const productUrl = new URL(
    productPath(input.product.slug),
    `${siteUrl}/`,
  ).toString()
  const transactionPrefix = `product_of_day:${input.product.id}:${input.periodKey}`
  const timestamp = new Date().toISOString()
  const subject = `Product of the Day: ${input.product.name}`
  const message =
    normalizeNovuString(input.product.tagline) ?? input.product.tagline

  let sent = 0
  let failures = 0
  let throttleState: ThrottleState = { count: 0, windowStart: Date.now() }

  for (const subscriberId of subscriberIds) {
    throttleState = await throttleProductOfDayRate(throttleState)

    try {
      await triggerNovuWorkflow({
        workflowId: workflow.workflowId,
        subscriber: {
          subscriberId,
          email: undefined, // subscriberId is the userId; email is managed in Novu already
        },
        ensureSubscriber: false,
        payload: {
          notification: {
            kind: "product_of_day",
            message,
            subject,
            timestamp,
            transactionId: `${transactionPrefix}:${subscriberId}`,
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
              period: "day",
              periodKey: input.periodKey,
              periodLabel: input.periodLabel,
              rank: 1,
              leaderboardUrl: input.leaderboardUrl,
            },
          },
          tags: ["newsletter", "discover"],
        },
      })
      sent += 1
    } catch (error) {
      failures += 1
      console.error("[novu] failed to broadcast product of the day", {
        error,
        subscriberId,
        productId: input.product.id,
        periodKey: input.periodKey,
      })
    }
  }

  return {
    sent,
    total: subscriberIds.length,
    reason: failures ? "send-failed" : null,
  }
}
