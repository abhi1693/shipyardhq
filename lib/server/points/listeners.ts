import prisma from "@/lib/prisma"
import { awardPoints } from "@/lib/points/engine"
import { PointsError } from "@/lib/points/errors"
import { on } from "@/lib/server/events"
import type { AwardPointsPayload } from "@/lib/points/types"

const UPVOTE_RULE_KEY = "points.upvote.give"
const REVIEW_RULE_KEY = "points.review.publish"
const REVIEW_DEPTH_RULE_KEY = "points.review.depth"
const REVIEW_DEPTH_THRESHOLD = 200

const IGNORED_ERROR_CODES = new Set(["COOLDOWN_ACTIVE", "CAP_EXCEEDED"])

async function getProductOwnerId(productId: string): Promise<string | null> {
  const record = await prisma.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  })
  return record?.userId ?? null
}

async function safelyAwardPoints(
  userId: string,
  ruleKey: string,
  payload: AwardPointsPayload,
  context: string,
) {
  try {
    await awardPoints(userId, ruleKey, payload)
  } catch (error) {
    if (error instanceof PointsError && IGNORED_ERROR_CODES.has(error.code)) {
      return
    }
    console.error(`[points] ${context} failed`, {
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

    await safelyAwardPoints(
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
      "award upvote points",
    )
  } catch (error) {
    console.error("[points] upvote listener error", { error, event })
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

    await safelyAwardPoints(
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
      "award review points",
    )

    if (event.messageLength > REVIEW_DEPTH_THRESHOLD) {
      await safelyAwardPoints(
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
    console.error("[points] review listener error", { error, event })
  }
})
