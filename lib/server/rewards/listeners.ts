import { registerEventHandler } from "@/lib/server/events"
import {
  awardRewardsSafely,
  getProductOwnerId,
} from "@/lib/server/rewards/helpers"

const UPVOTE_RULE_KEY = "rewards.upvote.give"
const REVIEW_RULE_KEY = "rewards.review.publish"
const REVIEW_DEPTH_RULE_KEY = "rewards.review.depth"
const PRODUCT_CREATED_RULE_KEY = "rewards.product.create"
const REVIEW_DEPTH_THRESHOLD = 200

registerEventHandler({
  event: "product.upvoted",
  id: "rewards.award-upvote",
  queue: "high",
  handler: async (event) => {
    try {
      const ownerId = await getProductOwnerId(event.productId)
      if (!ownerId) return
      if (ownerId === event.userId) return

      await awardRewardsSafely(
        event.userId,
        UPVOTE_RULE_KEY,
        {
          eventId: event.upvoteId,
          productId: event.productId,
          sourceType: "product.upvote",
          sourceId: event.upvoteId,
          targetType: "product",
          targetId: event.productId,
          actorUserId: event.userId,
          metadata: {
            occurredAt: event.occurredAt.toISOString(),
          },
        },
        "award upvote rewards",
      )
    } catch (error) {
      console.error("[rewards] upvote listener error", { error, event })
    }
  },
})

registerEventHandler({
  event: "product.reviewed",
  id: "rewards.award-review",
  queue: "default",
  handler: async (event) => {
    try {
      const ownerId =
        event.productOwnerId ?? (await getProductOwnerId(event.productId))
      if (ownerId && ownerId === event.userId) return

      const metadata = {
        rating: event.rating,
        messageLength: event.messageLength,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      }

      await awardRewardsSafely(
        event.userId,
        REVIEW_RULE_KEY,
        {
          eventId: event.reviewId,
          productId: event.productId,
          sourceType: "review",
          sourceId: event.reviewId,
          targetType: "product",
          targetId: event.productId,
          actorUserId: event.userId,
          metadata,
        },
        "award review rewards",
      )

      if (event.messageLength > REVIEW_DEPTH_THRESHOLD) {
        await awardRewardsSafely(
          event.userId,
          REVIEW_DEPTH_RULE_KEY,
          {
            eventId: `${event.reviewId}:depth`,
            productId: event.productId,
            sourceType: "review",
            sourceId: event.reviewId,
            targetType: "product",
            targetId: event.productId,
            actorUserId: event.userId,
            metadata,
          },
          "award review depth bonus",
        )
      }
    } catch (error) {
      console.error("[rewards] review listener error", { error, event })
    }
  },
})

registerEventHandler({
  event: "product.created",
  id: "rewards.award-product-created",
  queue: "default",
  handler: async (event) => {
    try {
      const ownerId = await getProductOwnerId(event.productId)
      if (!ownerId) return

      await awardRewardsSafely(
        ownerId,
        PRODUCT_CREATED_RULE_KEY,
        {
          eventId: `product.created:${event.productId}`,
          productId: event.productId,
          sourceType: "product",
          sourceId: event.productId,
          targetType: "product",
          targetId: event.productId,
          actorUserId: ownerId,
        },
        "award product creation rewards",
      )
    } catch (error) {
      console.error("[rewards] product.created listener error", {
        error,
        event,
      })
    }
  },
})
