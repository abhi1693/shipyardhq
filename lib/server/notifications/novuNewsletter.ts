import { TriggerRecipientsTypeEnum } from "@novu/api/models/components/triggerrecipientstypeenum"

import {
  guardNovuWorkflow,
  subscribeNovuTopic,
  triggerNovuWorkflow,
  getNovuClient,
} from "@/lib/server/notifications/novu"

const NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter"
export const NOVU_WEEKLY_NEWSLETTER_TOPIC_KEY =
  process.env.NOVU_TOPIC_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter"

type DigestProduct = {
  id: string
  name: string
  tagline: string
  url: string
  category: string | null
  publishedAt: string | null
  revenueLabel?: string | null
}

export async function subscribeToWeeklyNewsletterTopic(
  subscriberId: string,
): Promise<void> {
  const normalized = subscriberId?.trim()
  if (!normalized) return

  await subscribeNovuTopic(NOVU_WEEKLY_NEWSLETTER_TOPIC_KEY, normalized)
}

type WeeklyNewsletterPayload = {
  weekStart: string
  weekEnd: string
  featured: DigestProduct[]
  trending: DigestProduct[]
  fresh: DigestProduct[]
  ctaUrl: string
  html?: string
  text?: string
}

export async function sendWeeklyNewsletterNotification(input: {
  email: string
  payload: WeeklyNewsletterPayload
}): Promise<boolean> {
  const workflow = guardNovuWorkflow(NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID, {
    label: "weekly newsletter",
    missingMessage: "[novu] weekly newsletter workflow id missing",
  })
  if (!workflow.ready) return false

  const subscriberId = input.email?.trim().toLowerCase()
  if (!subscriberId) {
    console.warn("[novu] weekly newsletter missing subscriber email")
    return false
  }

  const subscriber = {
    subscriberId,
    email: input.email,
  }

  try {
    const timestamp = new Date().toISOString()
    const subject = "This week on Shipyard HQ"
    const message =
      "Featured launches, fresh listings, and trending products from Shipyard HQ."

    const {
      html: contentHtml,
      text: contentText,
      ...restPayload
    } = input.payload

    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "weekly_newsletter",
          subject,
          message,
          timestamp,
        },
        newsletter: {
          ...restPayload,
          html: contentHtml,
          text: contentText,
        },
        links: {
          browse: input.payload.ctaUrl,
        },
        tags: ["newsletter", "discover"],
      },
      transactionId: `weekly_newsletter:${subscriberId}:${input.payload.weekEnd}`,
    })
    return true
  } catch (error) {
    console.error("[novu] failed to send weekly newsletter", {
      error,
      subscriberId,
    })
    return false
  }
}

export async function sendWeeklyNewsletterTopicNotification(
  payload: WeeklyNewsletterPayload,
): Promise<boolean> {
  const workflow = guardNovuWorkflow(NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID, {
    label: "weekly newsletter",
    missingMessage: "[novu] weekly newsletter workflow id missing",
  })
  if (!workflow.ready) return false

  const topicKey = NOVU_WEEKLY_NEWSLETTER_TOPIC_KEY?.trim()
  if (!topicKey) {
    console.warn("[novu] weekly newsletter topic key missing")
    return false
  }

  try {
    const client = getNovuClient()
    const timestamp = new Date().toISOString()
    const subject = "This week on Shipyard HQ"
    const message =
      "Featured launches, fresh listings, and trending products from Shipyard HQ."

    const {
      html: contentHtml,
      text: contentText,
      ...restPayload
    } = payload

    await client.trigger({
      workflowId: workflow.workflowId,
      to: {
        type: TriggerRecipientsTypeEnum.Topic,
        topicKey,
      },
      payload: {
        notification: {
          kind: "weekly_newsletter",
          subject,
          message,
          timestamp,
        },
        newsletter: {
          ...restPayload,
          html: contentHtml,
          text: contentText,
        },
        links: {
          browse: payload.ctaUrl,
        },
        tags: ["newsletter", "discover"],
      },
      transactionId: `weekly_newsletter_topic:${topicKey}:${payload.weekEnd}`,
    })
    return true
  } catch (error) {
    console.error("[novu] failed to send weekly newsletter to topic", {
      error,
      topicKey,
    })
    return false
  }
}
