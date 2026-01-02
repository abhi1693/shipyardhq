import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"

const HOUR_MS = 60 * 60 * 1000

const NOVU_FEATURED_PROMO_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PROMOTIONS_FEATURED?.trim() || "promotions-featured"

const NOVU_TRENDING_PROMO_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PROMOTIONS_TRENDING?.trim() ||
  NOVU_FEATURED_PROMO_WORKFLOW_ID

export type FeaturedPromoPayload = {
  promotion: {
    kind: "featured_plan_promo"
    discountPct: number
    discountCode: string
    expiresAt: string
    redeemLimit: number
    validDays: number
    cooldownDays: number
    provider: "dodo"
  }
  plan: {
    slug: string
    name: string
    description: string | null
    boostForDays: number
    priceCents: number
    discountedPriceCents: number
    currencyCode: string
    highlights: Array<{
      key: string
      name: string
      description: string
    }>
  }
  product: {
    id: string
    slug: string
    name: string
  }
  instructions: {
    steps: string[]
  }
  cta: {
    label: string
    url: string | null
  }
  links: {
    upgrade: string | null
    public: string | null
  }
  context?: Record<string, unknown>
}

function buildMetricsNudge(
  context?: FeaturedPromoPayload["context"],
): string | null {
  if (!context || typeof context !== "object") return null
  const metrics = (context as { metrics?: Record<string, unknown> }).metrics
  if (!metrics) return null

  const trafficRaw = metrics.traffic7d
  const upvotesRaw = metrics.upvotes7d
  const traffic =
    typeof trafficRaw === "number" && Number.isFinite(trafficRaw)
      ? Math.max(0, Math.round(trafficRaw))
      : 0
  const upvotes =
    typeof upvotesRaw === "number" && Number.isFinite(upvotesRaw)
      ? Math.max(0, Math.round(upvotesRaw))
      : 0

  if (traffic <= 0 && upvotes <= 0) return null

  const parts: string[] = []
  if (traffic > 0) parts.push(`${traffic} views`)
  if (upvotes > 0) parts.push(`${upvotes} upvotes`)

  const summary = parts.join(" and ")
  return `Last 7 days: ${summary}. Featured placement can turn that momentum into more reach.`
}

function buildExpiresLabel({
  expiresAt,
  sentAt,
  fallbackDays,
}: {
  expiresAt: string
  sentAt: string
  fallbackDays: number
}): string {
  const safeFallbackDays = Math.max(1, Math.floor(fallbackDays))
  const sentDate = new Date(sentAt)
  const expiresDate = new Date(expiresAt)

  if (
    !Number.isFinite(sentDate.getTime()) ||
    !Number.isFinite(expiresDate.getTime())
  ) {
    return safeFallbackDays === 1 ? "24 hours" : `${safeFallbackDays} days`
  }

  const deltaMs = expiresDate.getTime() - sentDate.getTime()
  if (deltaMs <= 0) {
    return safeFallbackDays === 1 ? "24 hours" : `${safeFallbackDays} days`
  }

  const hours = Math.max(1, Math.ceil(deltaMs / HOUR_MS))
  if (hours <= 24) {
    return hours === 1 ? "1 hour" : `${hours} hours`
  }

  const days = Math.max(1, Math.ceil(hours / 24))
  return days === 1 ? "1 day" : `${days} days`
}

export async function sendFeaturedPlanPromotionNotification(input: {
  recipient: NovuSubscriberInput
  transactionId: string
  payload: FeaturedPromoPayload
}): Promise<boolean> {
  const workflow = guardNovuWorkflow(NOVU_FEATURED_PROMO_WORKFLOW_ID, {
    label: "featured promotions",
    missingMessage: "[novu] promotions featured workflow id missing",
  })
  if (!workflow.ready) return false

  const timestamp = new Date().toISOString()
  const pct = input.payload.promotion.discountPct
  const code = input.payload.promotion.discountCode
  const boostDays = input.payload.plan.boostForDays
  const highlights = input.payload.plan.highlights ?? []
  const highlightLabel = highlights.length
    ? highlights
        .map((item) => item.name)
        .slice(0, 3)
        .join(" + ")
    : "Featured boost"

  const validDays = Math.max(0, Math.floor(input.payload.promotion.validDays))
  const expiresLabel = buildExpiresLabel({
    expiresAt: input.payload.promotion.expiresAt,
    sentAt: timestamp,
    fallbackDays: validDays,
  })
  const metricsNudge = buildMetricsNudge(input.payload.context)

  const subject = `Get ${pct}% off`
  const message = [
    `Unlock ${highlightLabel} for ${boostDays} days.`,
    `Your ${pct}% discount is applied at checkout (code ${code}). Offer ends in ${expiresLabel}.`,
    metricsNudge,
  ]
    .filter(Boolean)
    .join(" ")

  try {
    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber: input.recipient,
      transactionId: input.transactionId,
      payload: {
        notification: {
          kind: input.payload.promotion.kind,
          subject,
          message,
          timestamp,
          transactionId: input.transactionId,
        },
        ...input.payload,
        meta: {
          promotionId: input.transactionId,
          sentAt: timestamp,
        },
        tags: ["promotion", "featured"],
      },
    })
    return true
  } catch (error) {
    console.error("[novu] failed to send featured promo notification", {
      error,
      subscriberId: input.recipient.subscriberId,
      transactionId: input.transactionId,
    })
    return false
  }
}

export async function sendTrendingBoostPromotionNotification(input: {
  recipient: NovuSubscriberInput
  transactionId: string
  payload: FeaturedPromoPayload
}): Promise<boolean> {
  const workflow = guardNovuWorkflow(NOVU_TRENDING_PROMO_WORKFLOW_ID, {
    label: "trending promotions",
    missingMessage: "[novu] promotions trending workflow id missing",
  })
  if (!workflow.ready) return false

  const timestamp = new Date().toISOString()
  const pct = input.payload.promotion.discountPct
  const code = input.payload.promotion.discountCode
  const boostDays = input.payload.plan.boostForDays
  const highlights = input.payload.plan.highlights ?? []
  const highlightLabel = highlights.length
    ? highlights
        .map((item) => item.name)
        .slice(0, 3)
        .join(" + ")
    : "Featured boost"

  const validDays = Math.max(0, Math.floor(input.payload.promotion.validDays))
  const expiresLabel = buildExpiresLabel({
    expiresAt: input.payload.promotion.expiresAt,
    sentAt: timestamp,
    fallbackDays: validDays,
  })
  const metricsNudge = buildMetricsNudge(input.payload.context)

  const subject = `Get ${pct}% off`
  const message = [
    `Your product is trending. Extend the momentum with ${highlightLabel} for ${boostDays} days — ${pct}% off (code ${code}). Offer ends in ${expiresLabel}.`,
    metricsNudge,
  ]
    .filter(Boolean)
    .join(" ")

  try {
    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber: input.recipient,
      transactionId: input.transactionId,
      payload: {
        notification: {
          kind: input.payload.promotion.kind,
          subject,
          message,
          timestamp,
          transactionId: input.transactionId,
        },
        ...input.payload,
        meta: {
          promotionId: input.transactionId,
          sentAt: timestamp,
        },
        tags: ["promotion", "featured", "trending"],
      },
    })
    return true
  } catch (error) {
    console.error("[novu] failed to send trending promo notification", {
      error,
      subscriberId: input.recipient.subscriberId,
      transactionId: input.transactionId,
    })
    return false
  }
}
