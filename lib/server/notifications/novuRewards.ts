import {
  ensureNovuSubscriber,
  isNovuEnabled,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { resolveSiteUrl } from "@/lib/siteConfig"

const NOVU_REWARDS_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_REWARDS_NOTIFICATIONS?.trim() ?? null

export type RewardsNotificationKind = "reward_awarded" | "reward_adjusted"

export type RewardsNotificationPayload = {
  kind: RewardsNotificationKind
  message: string
  subject: string
  recipient: NovuSubscriberInput
  reward: {
    amount: number
    balanceAfter?: number | null
    reason?: string | null
    ruleKey?: string | null
    ruleName?: string | null
    transactionId?: string | null
    awardedAt?: string | null
    sourceType?: string | null
    sourceId?: string | null
    targetType?: string | null
    targetId?: string | null
    productId?: string | null
  }
  actor?: NovuSubscriberInput | null
  links?: { member?: string | null }
  context?: Record<string, unknown>
  transactionId?: string
  tags?: string[]
}

export async function sendRewardsNotificationToNovu(
  payload: RewardsNotificationPayload,
): Promise<void> {
  if (!isNovuEnabled()) return
  if (!NOVU_REWARDS_WORKFLOW_ID) {
    console.warn("[novu] NOVU_WORKFLOW_REWARDS_NOTIFICATIONS is not set")
    return
  }

  const { recipient, actor, ...rest } = payload

  try {
    const siteUrl = resolveSiteUrl()
    await ensureNovuSubscriber(recipient)
    if (actor) {
      await ensureNovuSubscriber(actor)
    }

    const memberLinkRaw = normalizeString(rest.links?.member)
    const memberLink = memberLinkRaw
      ? new URL(memberLinkRaw, `${siteUrl}/`).toString()
      : siteUrl

    const actorPayload = actor
      ? {
          id: actor.subscriberId,
          firstName: normalizeString(actor.firstName) ?? undefined,
          lastName: normalizeString(actor.lastName) ?? undefined,
          email: normalizeString(actor.email),
        }
      : undefined

    await triggerNovuWorkflow({
      workflowId: NOVU_REWARDS_WORKFLOW_ID,
      subscriber: recipient,
      actor: actor ?? undefined,
      transactionId: payload.transactionId,
      payload: {
        notification: {
          kind: rest.kind,
          message: rest.message,
          subject: rest.subject ?? null,
          timestamp: new Date().toISOString(),
          transactionId: payload.transactionId ?? null,
        },
        reward: rest.reward,
        ...(actorPayload ? { actor: actorPayload } : {}),
        links: { member: memberLink },
        context: rest.context ?? {},
        tags: rest.tags ?? ["rewards"],
      },
    })
  } catch (error) {
    console.error("[novu] failed to send rewards notification", {
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
