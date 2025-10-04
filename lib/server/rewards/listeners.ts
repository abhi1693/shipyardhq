import prisma from "@/lib/prisma"
import { awardRewards } from "@/lib/rewards/engine"
import { RewardsError } from "@/lib/rewards/errors"
import { on } from "@/lib/server/events"
import type { AwardRewardsPayload } from "@/lib/rewards/types"

const UPVOTE_RULE_KEY = "rewards.upvote.give"
const REVIEW_RULE_KEY = "rewards.review.publish"
const REVIEW_DEPTH_RULE_KEY = "rewards.review.depth"
const REVIEW_DEPTH_THRESHOLD = 200

const IGNORED_ERROR_CODES = new Set(["COOLDOWN_ACTIVE", "CAP_EXCEEDED"])

async function getProductOwnerId(productId: string): Promise<string | null> {
  const record = await prisma.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  })
  return record?.userId ?? null
}

async function safelyAwardRewards(
  userId: string,
  ruleKey: string,
  payload: AwardRewardsPayload,
  context: string,
) {
  try {
    await awardRewards(userId, ruleKey, payload)
  } catch (error) {
    if (error instanceof RewardsError && IGNORED_ERROR_CODES.has(error.code)) {
      return
    }
    console.error(`[rewards] ${context} failed`, {
      error,
      userId,
      ruleKey,
      payload,
    })
  }
}

on("product.upvoted", async (event) => {
  try {
    const ownerId = await getProductOwnerId(event.productId)
    if (!ownerId) return
    if (ownerId === event.userId) return

    await safelyAwardRewards(
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
})

on("product.reviewed", async (event) => {
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

    await safelyAwardRewards(
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
      await safelyAwardRewards(
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
})
