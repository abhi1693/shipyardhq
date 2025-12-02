import {
  ensureNovuSubscriber,
  isNovuEnabled,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"

const NOVU_ADMIN_BROADCAST_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_ADMIN_BROADCAST?.trim() || "admin-broadcast"

type AdminBroadcastRecipient = {
  subscriberId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
}

type AdminBroadcastPayload = {
  subject: string
  html: string
  segment?: string | null
  tags?: string[]
}

type AdminBroadcastResult =
  | { sent: true; reason: null }
  | {
      sent: false
      reason: "novu-disabled" | "missing-workflow" | "send-failed"
    }

export async function sendAdminBroadcastNotification(input: {
  recipient: AdminBroadcastRecipient
  payload: AdminBroadcastPayload
  transactionId?: string
}): Promise<AdminBroadcastResult> {
  if (!isNovuEnabled()) {
    return { sent: false, reason: "novu-disabled" }
  }

  const workflowId = NOVU_ADMIN_BROADCAST_WORKFLOW_ID
  if (!workflowId) {
    console.warn("[novu] admin broadcast workflow id missing")
    return { sent: false, reason: "missing-workflow" }
  }

  const subscriber = {
    subscriberId: input.recipient.subscriberId.trim(),
    email: input.recipient.email ?? undefined,
    firstName: input.recipient.firstName ?? undefined,
    lastName: input.recipient.lastName ?? undefined,
  }

  const tags = input.payload.tags?.length
    ? input.payload.tags
    : ["admin", "broadcast"]

  try {
    await ensureNovuSubscriber(subscriber)

    await triggerNovuWorkflow({
      workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "admin_broadcast",
          subject: input.payload.subject,
          html: input.payload.html,
          segment: input.payload.segment ?? null,
          tags,
          timestamp: new Date().toISOString(),
        },
      },
      transactionId: input.transactionId?.trim() || undefined,
    })

    return { sent: true, reason: null }
  } catch (error) {
    console.error("[novu] failed to send admin broadcast", {
      error,
      subscriberId: subscriber.subscriberId,
    })
    return { sent: false, reason: "send-failed" }
  }
}

export type { AdminBroadcastPayload, AdminBroadcastRecipient }
