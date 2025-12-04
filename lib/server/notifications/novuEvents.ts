import prisma from "@/lib/prisma"
import {
  memberProductPath,
  MEMBER_REWARDS_PATH,
  productPath,
} from "@/lib/routes"
import {
  toNovuSubscriberInput,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { sendProductNotificationToNovu } from "@/lib/server/notifications/novuProduct"
import { sendRewardsNotificationToNovu } from "@/lib/server/notifications/novuRewards"
import type {
  ProductReviewCreatedEvent,
  ProductUpvotedEvent,
  RewardsAdjustedEvent,
  RewardsAwardedEvent,
} from "@/lib/server/events"
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

export async function notifyNovuProductUpvote(
  event: ProductUpvotedEvent,
): Promise<void> {
  try {
    const [product, actor] = await Promise.all([
      loadProduct(event.productId),
      loadUser(event.userId),
    ])

    if (!product) return
    if (!actor) return
    if (product.userId === actor.id) return

    const owner = await loadUser(product.userId)
    const recipient = toNovuSubscriberFromUser(owner)
    const actorSubscriber = toNovuSubscriberFromUser(actor)

    if (!recipient || !actorSubscriber) {
      console.warn(
        "[novu] skip product.upvote notification due to missing clerkId",
        {
          productId: product.id,
          recipientId: owner?.clerkId ?? null,
          actorId: actor?.clerkId ?? null,
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
      recipient,
      actor: actorSubscriber,
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
}

export async function notifyNovuProductReview(
  event: ProductReviewCreatedEvent,
): Promise<void> {
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
    const recipient = toNovuSubscriberFromUser(owner)
    const actorSubscriber = toNovuSubscriberFromUser(reviewer)

    if (!recipient || !actorSubscriber) {
      console.warn(
        "[novu] skip product.review notification due to missing clerkId",
        {
          productId: product.id,
          recipientId: owner?.clerkId ?? null,
          actorId: reviewer?.clerkId ?? null,
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
      recipient,
      actor: actorSubscriber,
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
}

export async function notifyNovuRewardAwarded(
  event: RewardsAwardedEvent,
): Promise<void> {
  try {
    const recipientUser = await loadUser(event.userId)
    const recipient = toNovuSubscriberFromUser(recipientUser)

    if (!recipient) {
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

    const context: Record<string, unknown> = {}
    if (metadataRecord) {
      context.metadata = metadataRecord
    }
    if (product) {
      context.product = {
        id: product.id,
        slug: product.slug,
        name: product.name,
      }
    }

    await sendRewardsNotificationToNovu({
      kind: "reward_awarded",
      message,
      subject: `You earned ${pointsLabel}`,
      recipient,
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
      context,
      transactionId: `reward_awarded:${event.transactionId}`,
      tags: ["rewards"],
    })
  } catch (error) {
    console.error("[notifications] failed to handle rewards.awarded", {
      error,
      event,
    })
  }
}

export async function notifyNovuRewardAdjusted(
  event: RewardsAdjustedEvent,
): Promise<void> {
  try {
    if (event.amount <= 0) return

    const [recipientUser, actorUser] = await Promise.all([
      loadUser(event.userId),
      event.actorUserId ? loadUser(event.actorUserId) : Promise.resolve(null),
    ])

    const recipient = toNovuSubscriberFromUser(recipientUser)
    const actorSubscriber = actorUser
      ? toNovuSubscriberFromUser(actorUser)
      : null

    if (!recipient) {
      console.warn(
        "[novu] skip rewards.adjusted notification due to missing clerkId",
        {
          userId: event.userId,
        },
      )
      return
    }

    const metadataRecord = toMetadataRecord(event.metadata)
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

    const context: Record<string, unknown> = {
      source:
        metadataRecord && typeof metadataRecord.source === "string"
          ? metadataRecord.source
          : "admin.adjustment",
      grantedAt: event.createdAt.toISOString(),
    }

    await sendRewardsNotificationToNovu({
      kind: "reward_adjusted",
      message,
      subject: `Shipyard team granted ${pointsLabel}`,
      recipient,
      actor: actorSubscriber,
      reward: {
        amount: event.amount,
        balanceAfter: event.balanceAfter,
        reason: hasReason ? rawReason : null,
        transactionId: event.transactionId,
      },
      links: {
        member: MEMBER_REWARDS_PATH,
      },
      context,
      transactionId: `reward_adjusted:${event.transactionId}`,
      tags: ["rewards"],
    })
  } catch (error) {
    console.error("[notifications] failed to handle rewards.adjusted", {
      error,
      event,
    })
  }
}

function toNovuSubscriberFromUser(
  user: BasicUser | null,
): NovuSubscriberInput | null {
  if (!user) return null
  return toNovuSubscriberInput({
    subscriberId: user.clerkId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  })
}

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
