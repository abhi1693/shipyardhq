import { TriggerRecipientsTypeEnum } from "@novu/api/models/components/triggerrecipientstypeenum"

import {
  getNovuClient,
  guardNovuWorkflow,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"
import { NOVU_SYSTEM_UPDATES_TOPIC_KEY } from "@/lib/server/notifications/novuSystemUpdates"

const NOVU_SYSTEM_UPDATES_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_SYSTEM_UPDATES?.trim() ||
  process.env.NOVU_WORKFLOW_ADMIN_BROADCAST?.trim() ||
  "system-updates"

type SystemUpdateRecipient = {
  subscriberId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
}

type SystemUpdatePayload = {
  subject: string
  html: string
  segment?: string | null
  tags?: string[]
}

type SystemUpdateResult =
  | { sent: true; reason: null }
  | {
      sent: false
      reason: "novu-disabled" | "missing-workflow" | "send-failed"
    }

export async function sendSystemUpdateNotification(input: {
  recipient: SystemUpdateRecipient
  payload: SystemUpdatePayload
  transactionId?: string
}): Promise<SystemUpdateResult> {
  const workflow = guardNovuWorkflow(NOVU_SYSTEM_UPDATES_WORKFLOW_ID, {
    label: "system updates",
    missingMessage: "[novu] system updates workflow id missing",
  })
  if (!workflow.ready) {
    return { sent: false, reason: workflow.reason }
  }

  const subscriber = {
    subscriberId: input.recipient.subscriberId.trim(),
    email: input.recipient.email ?? undefined,
    firstName: input.recipient.firstName ?? undefined,
    lastName: input.recipient.lastName ?? undefined,
  }

  const tags = input.payload.tags?.length
    ? input.payload.tags
    : ["system-updates", "broadcast"]

  try {
    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "system_update",
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
    console.error("[novu] failed to send system update", {
      error,
      subscriberId: subscriber.subscriberId,
    })
    return { sent: false, reason: "send-failed" }
  }
}

export type { SystemUpdatePayload, SystemUpdateRecipient }

export async function sendSystemUpdateTopicNotification(input: {
  topicKey?: string | null
  payload: SystemUpdatePayload
  transactionId?: string
}): Promise<SystemUpdateResult> {
  const workflow = guardNovuWorkflow(NOVU_SYSTEM_UPDATES_WORKFLOW_ID, {
    label: "system updates",
    missingMessage: "[novu] system updates workflow id missing",
  })
  if (!workflow.ready) {
    return { sent: false, reason: workflow.reason }
  }

  const topicKey =
    input.topicKey?.trim() || NOVU_SYSTEM_UPDATES_TOPIC_KEY?.trim()
  if (!topicKey) {
    console.warn("[novu] system update missing topic key")
    return { sent: false, reason: "send-failed" }
  }

  const tags = input.payload.tags?.length
    ? input.payload.tags
    : ["system-updates", "broadcast"]

  try {
    const client = getNovuClient()
    await client.trigger({
      workflowId: workflow.workflowId,
      to: {
        type: TriggerRecipientsTypeEnum.Topic,
        topicKey,
      },
      payload: {
        notification: {
          kind: "system_update",
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
    console.error("[novu] failed to send system update to topic", {
      error,
      topicKey,
    })
    return { sent: false, reason: "send-failed" }
  }
}
