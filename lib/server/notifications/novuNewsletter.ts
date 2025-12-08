import {
  fetchAllNovuSubscriberEmails,
  guardNovuWorkflow,
  subscribeNovuTopic,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"

const RESEND_RATE_LIMIT_PER_SECOND = 2
const RESEND_WINDOW_MS = 1000

const NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter"
export const NOVU_WEEKLY_NEWSLETTER_TOPIC_KEY =
  process.env.NOVU_TOPIC_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter"

type SponsoredProduct = {
  id: string
  name: string
  tagline: string
  url: string
  category: string | null
  publishedAt: string | null
  revenueLabel?: string | null
}

type ProductOfTheWeek = {
  id: string
  name: string
  tagline: string
  url: string
  category: string | null
  publishedAt: string | null
  ownerName: string | null
  ownerUrl: string | null
  upvotes: number
  points: number
  revenueLabel?: string | null
}

type TrendingProduct = ProductOfTheWeek & { rank: number }

type WeeklyNewsletterPayload = {
  weekRange: string
  issueNumber: number
  ctaUrl: string
  sponsoredProducts: SponsoredProduct[]
  productOfTheWeek: ProductOfTheWeek | null
  trending: TrendingProduct[]
}

export async function subscribeToWeeklyNewsletterTopic(
  subscriberId: string,
): Promise<void> {
  const normalized = subscriberId?.trim()
  if (!normalized) return

  await subscribeNovuTopic(NOVU_WEEKLY_NEWSLETTER_TOPIC_KEY, normalized)
}

export async function sendWeeklyNewsletterNotification(input: {
  email: string
  payload: WeeklyNewsletterPayload
  weekKey: string
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
      "Product of the week, trending launches, and standout picks from the Shipyard community."

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
          ...input.payload,
        },
        links: {
          browse: input.payload.ctaUrl,
        },
        tags: ["newsletter", "discover"],
      },
      transactionId: `weekly_newsletter:${subscriberId}:${input.weekKey}`,
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

export async function sendWeeklyNewsletterToSubscribers(
  payload: WeeklyNewsletterPayload,
  weekKey: string,
): Promise<boolean> {
  const workflow = guardNovuWorkflow(NOVU_WEEKLY_NEWSLETTER_WORKFLOW_ID, {
    label: "weekly newsletter",
    missingMessage: "[novu] weekly newsletter workflow id missing",
  })
  if (!workflow.ready) return false

  const subscriberEmails = await fetchAllNovuSubscriberEmails()
  if (!subscriberEmails.length) {
    console.warn("[novu] weekly newsletter has no subscribers to notify")
    return false
  }

  try {
    const timestamp = new Date().toISOString()
    const subject = "This week on Shipyard HQ"
    const message =
      "Product of the week, trending launches, and standout picks from the Shipyard community."

    let rateState = { count: 0, windowStart: Date.now() }
    for (const [index, email] of subscriberEmails.entries()) {
      rateState = await throttleResendRate(rateState)

      await triggerNovuWorkflow({
        workflowId: workflow.workflowId,
        subscriber: {
          subscriberId: email,
          email,
        },
        payload: {
          notification: {
            kind: "weekly_newsletter",
            subject,
            message,
            timestamp,
          },
          newsletter: {
            ...payload,
          },
          links: {
            browse: payload.ctaUrl,
          },
          tags: ["newsletter", "discover"],
        },
        transactionId: `weekly_newsletter:${email}:${weekKey}:${index}`,
      })
    }

    return true
  } catch (error) {
    console.error("[novu] failed to send weekly newsletter to subscribers", {
      error,
    })
    return false
  }
}

async function throttleResendRate(state: {
  count: number
  windowStart: number
}): Promise<{ count: number; windowStart: number }> {
  const now = Date.now()
  const elapsed = now - state.windowStart

  if (elapsed >= RESEND_WINDOW_MS) {
    return { count: 1, windowStart: now }
  }

  if (state.count >= RESEND_RATE_LIMIT_PER_SECOND) {
    const waitMs = RESEND_WINDOW_MS - elapsed
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return { count: 1, windowStart: Date.now() }
  }

  return { count: state.count + 1, windowStart: state.windowStart }
}
