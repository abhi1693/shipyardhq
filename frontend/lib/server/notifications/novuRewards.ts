import {
  guardNovuWorkflow,
  normalizeNovuString,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { resolveSiteUrl } from "@/lib/siteConfig"

const NOVU_REWARDS_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_REWARDS_NOTIFICATIONS?.trim() ?? null

export type RewardsNotificationKind =
  | "reward_awarded"
  | "reward_adjusted"
  | "reward_backlink_reminder"

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
  const workflow = guardNovuWorkflow(NOVU_REWARDS_WORKFLOW_ID, {
    label: "rewards notifications",
    missingMessage: "[novu] NOVU_WORKFLOW_REWARDS_NOTIFICATIONS is not set",
  })
  if (!workflow.ready) return

  const { recipient, actor, ...rest } = payload

  try {
    const siteUrl = resolveSiteUrl()

    const memberLinkRaw = normalizeNovuString(rest.links?.member)
    const memberLink = memberLinkRaw
      ? new URL(memberLinkRaw, `${siteUrl}/`).toString()
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
      transactionId: payload.transactionId,
      ensureActor: Boolean(actor),
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
