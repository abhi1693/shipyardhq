import { dispatchEventAsync, registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { awardRewardsSafely } from "@/lib/server/rewards/helpers"

export const PRODUCT_VIEW_RULE_KEY = "rewards.product.view"
export const PRODUCT_VISIT_RULE_KEY = "rewards.product.visit"

function makeEventId(
  kind: "view" | "visit",
  productId: string,
  userId: string,
): string {
  const suffix = Date.now().toString(36)
  return `product.${kind}:${productId}:${userId}:${suffix}`
}

type QueueProductViewRewardOptions = {
  userId: string
  productId: string
  productSlug?: string
}

export function queueProductViewReward({
  userId,
  productId,
  productSlug,
}: QueueProductViewRewardOptions) {
  const rewardEventId = makeEventId("view", productId, userId)

  dispatchEventAsync(
    APP_EVENTS.PRODUCT_VIEWED,
    {
      productId,
      viewerUserId: userId,
      productSlug,
      rewardEventId,
    },
    { context: { productId, userId, slug: productSlug } },
  )
}

type ProductVisitRewardOptions = {
  userId: string
  productId: string
  destination?: string
}

export async function awardProductVisitReward({
  userId,
  productId,
  destination,
}: ProductVisitRewardOptions) {
  await awardRewardsSafely(
    userId,
    PRODUCT_VISIT_RULE_KEY,
    {
      eventId: makeEventId("visit", productId, userId),
      productId,
      sourceType: "product.visit",
      sourceId: productId,
      targetType: "product",
      targetId: productId,
      actorUserId: userId,
      metadata: destination ? { destination } : undefined,
    },
    "award product CTA click rewards",
  )
}

registerEventHandler({
  event: APP_EVENTS.PRODUCT_VIEWED,
  id: "rewards.award-product-view",
  mode: "async",
  queue: "default",
  handler: async (payload) => {
    await awardRewardsSafely(
      payload.viewerUserId,
      PRODUCT_VIEW_RULE_KEY,
      {
        eventId: payload.rewardEventId,
        productId: payload.productId,
        sourceType: "product.view",
        sourceId: payload.productId,
        targetType: "product",
        targetId: payload.productId,
        actorUserId: payload.viewerUserId,
        metadata: payload.productSlug
          ? { slug: payload.productSlug }
          : undefined,
      },
      "award product view rewards",
    )
  },
})
