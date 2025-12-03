import {
  guardNovuWorkflow,
  normalizeNovuString,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"

const NOVU_PRODUCT_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PRODUCT_NOTIFICATIONS?.trim() ?? null

export type ProductNotificationKind =
  | "product_upvote"
  | "product_review"
  | "product_published"
  | "product_insights_ready"
  | "product_payment_sync_error"

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
  const workflow = guardNovuWorkflow(NOVU_PRODUCT_WORKFLOW_ID, {
    label: "product notifications",
    missingMessage: "[novu] NOVU_WORKFLOW_PRODUCT_NOTIFICATIONS is not set",
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
