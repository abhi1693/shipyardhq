import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  memberProductPath,
  MEMBER_REWARDS_PATH,
  productPath,
} from "@/lib/routes"
import { sendProductNotificationToNovu } from "@/lib/server/notifications/novuProduct"
import { sendRewardsNotificationToNovu } from "@/lib/server/notifications/novuRewards"
import type { Prisma } from "@/lib/vendor/prisma/client"

const USER_NAME_FALLBACK = "Shipyard member"

type BasicUser = {
  id: string
  clerkId: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
}

type BasicProduct = {
  id: string
  userId: string
  name: string
  slug: string
}

const productSelector = {
  id: true,
  userId: true,
  name: true,
  slug: true,
} satisfies Prisma.ProductSelect

const userSelector = {
  id: true,
  clerkId: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect

registerEventHandler({
  event: APP_EVENTS.PRODUCT_UPVOTED,
  id: "notifications.product-upvote",
  mode: "sync",
  queue: "low",
  handler: async (event) => {
    try {
      const [product, actor] = await Promise.all([
        loadProduct(event.productId),
        loadUser(event.userId),
      ])
      if (!product) return
      if (!actor) return
      if (product.userId === actor.id) return

      const owner = await loadUser(product.userId)
      const recipientId = owner?.clerkId ?? null
      const actorId = actor.clerkId ?? null
      if (!recipientId || !actorId) {
        console.warn(
          "[novu] skip product.upvote notification due to missing clerkId",
          {
            productId: product.id,
            recipientId,
            actorId,
          },
        )
        return
      }

      const actorName = formatUserName(actor)
      const productName = formatProductName(product)
      const message = `${actorName} upvoted ${productName}`
      const subject = `New upvote on ${productName}`

      await sendProductNotificationToNovu({
        kind: "product_upvote",
        message,
        subject,
        recipient: {
          subscriberId: recipientId,
          firstName: owner?.firstName ?? null,
          lastName: owner?.lastName ?? null,
          email: owner?.email ?? null,
        },
        actor: {
          subscriberId: actorId,
          firstName: actor.firstName,
          lastName: actor.lastName,
        },
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
        },
        links: {
          member: memberProductPath(product.slug),
          public: productPath(product.slug),
        },
        context: {
          upvote: {
            id: event.upvoteId,
            occurredAt: event.occurredAt.toISOString(),
            actor: {
              id: actor.id,
              name: actorName,
            },
          },
        },
        transactionId: `product_upvote:${event.upvoteId}`,
      })
    } catch (error) {
      console.error("[notifications] failed to handle product.upvoted", {
        error,
        event,
      })
    }
  },
})

registerEventHandler({
  event: APP_EVENTS.PRODUCT_REVIEWED,
  id: "notifications.product-reviewed",
  mode: "sync",
  queue: "low",
  handler: async (event) => {
    try {
      const [product, reviewer] = await Promise.all([
        loadProduct(event.productId),
        loadUser(event.userId),
      ])

      if (!product) return
      if (!reviewer) return

      const ownerUserId = event.productOwnerId ?? product.userId
      if (!ownerUserId) return
      if (ownerUserId === reviewer.id) return
      const owner = await loadUser(ownerUserId)
      const recipientId = owner?.clerkId ?? null
      const actorId = reviewer.clerkId ?? null
      if (!recipientId || !actorId) {
        console.warn(
          "[novu] skip product.review notification due to missing clerkId",
          {
            productId: product.id,
            recipientId,
            actorId,
          },
        )
        return
      }

      const reviewerName = formatUserName(reviewer)
      const productName = formatProductName(product)
      const message = `New review on ${productName} by ${reviewerName}`
      const subject = `New review on ${productName}`

      await sendProductNotificationToNovu({
        kind: "product_review",
        message,
        subject,
        recipient: {
          subscriberId: recipientId,
          firstName: owner?.firstName ?? null,
          lastName: owner?.lastName ?? null,
          email: owner?.email ?? null,
        },
        actor: {
          subscriberId: actorId,
          firstName: reviewer.firstName,
          lastName: reviewer.lastName,
          email: reviewer.email,
        },
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
        },
        links: {
          member: memberProductPath(product.slug),
          public: productPath(product.slug),
        },
        context: {
          review: {
            id: event.reviewId,
            rating: event.rating,
            messageLength: event.messageLength,
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
            reviewer: {
              id: reviewer.id,
              name: reviewerName,
            },
          },
        },
        transactionId: `product_review:${event.reviewId}`,
      })
    } catch (error) {
      console.error("[notifications] failed to handle product.reviewed", {
        error,
        event,
      })
    }
  },
})

registerEventHandler({
  event: APP_EVENTS.REWARDS_AWARDED,
  id: "notifications.rewards-awarded",
  mode: "sync",
  handler: async (event) => {
    try {
      const recipientUser = await loadUser(event.userId)
      if (!recipientUser?.clerkId) {
        console.warn(
          "[novu] skip rewards.awarded notification due to missing clerkId",
          {
            userId: event.userId,
          },
        )
        return
      }

      const metadataRecord = toMetadataRecord(event.metadata)
      const resolvedProductId =
        event.productId ??
        extractProductId(metadataRecord) ??
        (event.targetType === "product" && typeof event.targetId === "string"
          ? event.targetId
          : null)

      const product = resolvedProductId
        ? await loadProduct(resolvedProductId)
        : null
      const productNameRaw = product ? formatProductName(product) : null
      const productName =
        productNameRaw && productNameRaw.toLowerCase() !== "your product"
          ? productNameRaw
          : null

      const pointsLabel =
        event.rewardAmount === 1 ? "1 point" : `${event.rewardAmount} points`
      const reason = normalizeReason(event.ruleName)
      const reasonIncludesProduct =
        productName && reason.toLowerCase().includes(productName.toLowerCase())
      const message = `You earned ${pointsLabel} for ${reason}${
        productName && !reasonIncludesProduct ? ` on ${productName}` : ""
      }.`

      await sendRewardsNotificationToNovu({
        kind: "reward_awarded",
        message,
        subject: `You earned ${pointsLabel}`,
        recipient: {
          subscriberId: recipientUser.clerkId,
          firstName: recipientUser.firstName ?? null,
          lastName: recipientUser.lastName ?? null,
          email: recipientUser.email ?? null,
        },
        reward: {
          amount: event.rewardAmount,
          balanceAfter: event.balanceAfter,
          ruleKey: event.ruleKey,
          ruleName: event.ruleName,
          reason,
          transactionId: event.transactionId,
          awardedAt: event.createdAt.toISOString(),
          sourceType: event.sourceType ?? null,
          sourceId: event.sourceId ?? null,
          targetType: event.targetType ?? null,
          targetId: event.targetId ?? null,
          productId: resolvedProductId ?? null,
        },
        links: {
          member: MEMBER_REWARDS_PATH,
        },
        context: {
          metadata: metadataRecord,
          product: product
            ? {
                id: product.id,
                slug: product.slug,
                name: product.name,
              }
            : null,
        },
        transactionId: `reward_awarded:${event.transactionId}`,
        tags: ["rewards"],
      })
    } catch (error) {
      console.error("[notifications] failed to handle rewards.awarded", {
        error,
        event,
      })
    }
  },
})

registerEventHandler({
  event: APP_EVENTS.REWARDS_ADJUSTED,
  id: "notifications.rewards-adjusted-grant",
  mode: "sync",
  handler: async (event) => {
    try {
      if (event.amount <= 0) {
        return
      }

      const [recipientUser, actorUser] = await Promise.all([
        loadUser(event.userId),
        event.actorUserId ? loadUser(event.actorUserId) : Promise.resolve(null),
      ])

      if (!recipientUser?.clerkId) {
        console.warn(
          "[novu] skip rewards.adjusted notification due to missing clerkId",
          {
            userId: event.userId,
          },
        )
        return
      }

      const metadataRecord = toMetadataRecord(event.metadata)
      const reference =
        metadataRecord && typeof metadataRecord.reference === "string"
          ? metadataRecord.reference
          : null
      const initiatedBy =
        metadataRecord && typeof metadataRecord.initiatedBy === "object"
          ? metadataRecord.initiatedBy
          : null

      const pointsLabel =
        event.amount === 1 ? "1 point" : `${event.amount} points`
      const rawReason =
        typeof event.notes === "string"
          ? event.notes.replace(/\s+/g, " ").trim()
          : ""
      const hasReason = rawReason.length > 0

      let message = `Shipyard team granted you ${pointsLabel}`
      if (hasReason) {
        message += ` — ${rawReason}`
        if (!/[.!?]$/.test(rawReason)) {
          message += "."
        }
      } else {
        message += "."
      }

      await sendRewardsNotificationToNovu({
        kind: "reward_adjusted",
        message,
        subject: `Shipyard team granted ${pointsLabel}`,
        recipient: {
          subscriberId: recipientUser.clerkId,
          firstName: recipientUser.firstName ?? null,
          lastName: recipientUser.lastName ?? null,
          email: recipientUser.email ?? null,
        },
        actor: actorUser?.clerkId
          ? {
              subscriberId: actorUser.clerkId,
              firstName: actorUser.firstName ?? null,
              lastName: actorUser.lastName ?? null,
              email: actorUser.email ?? null,
            }
          : null,
        reward: {
          amount: event.amount,
          balanceAfter: event.balanceAfter,
          reason: hasReason ? rawReason : null,
          transactionId: event.transactionId,
        },
        links: {
          member: MEMBER_REWARDS_PATH,
        },
        context: {
          reference,
          initiatedBy,
          metadata: metadataRecord,
          source:
            metadataRecord && typeof metadataRecord.source === "string"
              ? metadataRecord.source
              : "admin.adjustment",
          grantedAt: event.createdAt.toISOString(),
          actorUserId: event.actorUserId ?? null,
        },
        transactionId: `reward_adjusted:${event.transactionId}`,
        tags: ["rewards"],
      })
    } catch (error) {
      console.error("[notifications] failed to handle rewards.adjusted", {
        error,
        event,
      })
    }
  },
})

async function loadProduct(productId: string): Promise<BasicProduct | null> {
  if (!productId) return null
  return prisma.product.findUnique({
    where: { id: productId },
    select: productSelector,
  })
}

async function loadUser(userId: string): Promise<BasicUser | null> {
  if (!userId) return null
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelector,
  })
}

function formatUserName(user: BasicUser | null): string {
  if (!user) return USER_NAME_FALLBACK
  const parts = [user.firstName?.trim(), user.lastName?.trim()].filter(
    Boolean,
  ) as string[]

  if (!parts.length) return USER_NAME_FALLBACK
  return parts.join(" ")
}

function formatProductName(product: BasicProduct | null): string {
  if (!product) return "your product"
  const name = product.name?.trim()
  if (name && name.length > 0) {
    return name
  }
  return product.slug?.trim() || "your product"
}

function toMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null
  if (Array.isArray(metadata)) return null
  return metadata as Record<string, unknown>
}

function extractProductId(
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) return null
  const potentialKeys = ["productId", "targetId", "product_id"]
  for (const key of potentialKeys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }
  return null
}

function normalizeReason(reason?: string | null): string {
  const trimmed = reason?.trim() ?? ""
  if (!trimmed) return "your activity"
  return trimmed.replace(/\.+$/, "")
}
