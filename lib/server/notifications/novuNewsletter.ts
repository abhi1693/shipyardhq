import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"

const NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter"

type DigestProduct = {
  id: string
  name: string
  tagline: string
  url: string
  category: string | null
  publishedAt: string | null
  revenueLabel?: string | null
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
}): Promise<void> {
  const workflow = guardNovuWorkflow(NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID, {
    label: "weekly newsletter",
    missingMessage: "[novu] weekly newsletter workflow id missing",
  })
  if (!workflow.ready) return

  const subscriberId = input.email?.trim().toLowerCase()
  if (!subscriberId) {
    console.warn("[novu] weekly newsletter missing subscriber email")
    return
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

    const { html: contentHtml, text: contentText, ...restPayload } =
      input.payload

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
  } catch (error) {
    console.error("[novu] failed to send weekly newsletter", {
      error,
      subscriberId,
    })
  }
}
