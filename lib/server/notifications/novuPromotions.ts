import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"

const NOVU_FEATURED_PROMO_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PROMOTIONS_FEATURED?.trim() || "promotions-featured"

type FeaturedPromoPayload = {
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
  const productName = input.payload.product.name
  const boostDays = input.payload.plan.boostForDays
  const highlights = input.payload.plan.highlights ?? []
  const highlightLabel = highlights.length
    ? highlights.map((item) => item.name).slice(0, 3).join(" + ")
    : "Featured boost"

  const subject = `${productName}: ${pct}% off Featured boost`
  const message = `Unlock ${highlightLabel} for ${boostDays} days. Use code ${code} at checkout within ${input.payload.promotion.validDays} days (single-use).`

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
