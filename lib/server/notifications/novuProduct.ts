import {
  ensureNovuSubscriber,
  isNovuEnabled,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"

const NOVU_PRODUCT_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PRODUCT_NOTIFICATIONS?.trim() ?? null

export type ProductNotificationKind =
  | "product_upvote"
  | "product_review"
  | "product_update"

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
}

export async function sendProductNotificationToNovu(
  payload: ProductNotificationPayload,
): Promise<void> {
  if (!isNovuEnabled()) return
  if (!NOVU_PRODUCT_WORKFLOW_ID) {
    console.warn("[novu] NOVU_WORKFLOW_PRODUCT_NOTIFICATIONS is not set")
    return
  }

  const { recipient, actor, ...rest } = payload

  try {
    await ensureNovuSubscriber(recipient)
    if (actor) {
      await ensureNovuSubscriber(actor)
    }

    await triggerNovuWorkflow({
      workflowId: NOVU_PRODUCT_WORKFLOW_ID,
      subscriber: recipient,
      actor: actor ?? undefined,
      transactionId: payload.transactionId,
      payload: {
        notification: {
          kind: rest.kind,
          message: rest.message,
          timestamp: new Date().toISOString(),
          transactionId: payload.transactionId ?? null,
          subject: rest.subject ?? null,
        },
        product: rest.product,
        actor: actor
          ? {
              id: actor.subscriberId,
              firstName: normalizeString(actor.firstName) ?? undefined,
              lastName: normalizeString(actor.lastName) ?? undefined,
              email: normalizeString(actor.email),
            }
          : null,
        links: {
          member: normalizeString(rest.links?.member) ?? null,
          public:
            normalizeString(rest.links?.public) ??
            normalizeString(rest.links?.member) ??
            null,
        },
        context: rest.context ?? {},
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

function normalizeString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
