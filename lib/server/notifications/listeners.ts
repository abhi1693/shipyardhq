import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  memberProductPath,
  MEMBER_REWARDS_PATH,
  productPath,
} from "@/lib/routes"
import { createNotification } from "@/lib/server/notifications/service"
import { sendProductNotificationToNovu } from "@/lib/server/notifications/novuProduct"
import { NotificationType, type Prisma } from "@/lib/vendor/prisma/client"

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
  queue: "low",
  handler: async (event) => {
    try {
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

      const metadata: Prisma.InputJsonValue = {
        transactionId: event.transactionId,
        ruleKey: event.ruleKey,
        ruleName: event.ruleName,
        ruleDisplayName: reason,
        rewardAmount: event.rewardAmount,
        balanceAfter: event.balanceAfter,
        sourceType: event.sourceType ?? null,
        sourceId: event.sourceId ?? null,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        productId: resolvedProductId ?? null,
        productName,
        productSlug: product?.slug ?? null,
        href: MEMBER_REWARDS_PATH,
        eventMetadata: event.metadata ?? null,
        awardedAt: event.createdAt.toISOString(),
      }

      await createNotification({
        userId: event.userId,
        type: NotificationType.reward_awarded,
        message,
        metadata,
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
  queue: "low",
  handler: async (event) => {
    try {
      if (event.amount <= 0) {
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

      const metadata: Prisma.InputJsonValue = {
        transactionId: event.transactionId,
        rewardAmount: event.amount,
        balanceAfter: event.balanceAfter,
        actorUserId: event.actorUserId ?? null,
        reason: hasReason ? rawReason : null,
        reference,
        initiatedBy,
        notificationKind: "admin_reward_grant",
        source:
          metadataRecord && typeof metadataRecord.source === "string"
            ? metadataRecord.source
            : "admin.adjustment",
        href: MEMBER_REWARDS_PATH,
        grantedAt: event.createdAt.toISOString(),
      }

      await createNotification({
        userId: event.userId,
        type: NotificationType.reward_awarded,
        message,
        metadata,
      })
    } catch (error) {
      console.error("[notifications] failed to handle rewards.adjusted", {
        error,
        event,
      })
    }
  },
})

registerEventHandler({
  event: APP_EVENTS.PRODUCT_UPDATE_PUBLISHED,
  id: "notifications.product-update-published",
  mode: "sync",
  queue: "low",
  handler: async (event) => {
    try {
      const upvotes = await prisma.productUpvote.findMany({
        where: { productId: event.productId },
        select: { userId: true },
      })

      if (!upvotes.length) return

      const excludedUsers = new Set(
        [event.productOwnerId, event.authorId].filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        ),
      )

      const userIds = new Set<string>()
      for (const vote of upvotes) {
        const userId = vote.userId
        if (!userId) continue
        if (excludedUsers.has(userId)) continue
        userIds.add(userId)
      }

      if (userIds.size === 0) return

      const subscribers = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: userSelector,
      })
      const subscriberById = new Map<string, BasicUser>(
        subscribers.map((user: BasicUser) => [user.id, user] as const),
      )

      const rawProductName = event.productName?.trim()
      const productName =
        rawProductName && rawProductName.length > 0
          ? rawProductName
          : "one of your upvoted products"
      const rawTitle = event.updateTitle?.trim()
      const updateTitle =
        rawTitle && rawTitle.length > 0 ? rawTitle : "a new update"
      const href =
        event.productSlug && event.productSlug.trim().length > 0
          ? productPath(event.productSlug)
          : null
      const publishedAtDate =
        event.updatePublishedAt instanceof Date
          ? event.updatePublishedAt
          : new Date(event.updatePublishedAt ?? Date.now())
      const publishedAtIso = Number.isNaN(publishedAtDate.getTime())
        ? new Date().toISOString()
        : publishedAtDate.toISOString()
      const message = `New update on ${productName}: ${updateTitle}`
      const subject = `Product update: ${productName}`

      const recipients = Array.from(userIds)
        .map((userId) => {
          const recipient = subscriberById.get(userId)
          return recipient?.clerkId
            ? { userId, clerkId: recipient.clerkId, user: recipient }
            : null
        })
        .filter(Boolean) as Array<{
        userId: string
        clerkId: string
        user: BasicUser
      }>

      if (recipients.length === 0) {
        console.warn("[novu] no recipients with clerkId for product update", {
          productId: event.productId,
          updateId: event.updateId,
          candidateCount: userIds.size,
        })
        return
      }

      await Promise.all(
        recipients.map(({ userId, clerkId, user }) =>
          sendProductNotificationToNovu({
            kind: "product_update",
            message,
            subject,
            recipient: {
              subscriberId: clerkId,
              firstName: user.firstName ?? null,
              lastName: user.lastName ?? null,
              email: user.email ?? null,
            },
            product: {
              id: event.productId,
              slug: event.productSlug ?? null,
              name: event.productName ?? null,
            },
            links: {
              member: href,
              public: href,
            },
            context: {
              update: {
                id: event.updateId,
                title: event.updateTitle,
                summary: event.updateSummary ?? null,
                publishedAt: publishedAtIso,
                ownerId: event.productOwnerId,
                authorId: event.authorId,
              },
            },
            transactionId: `product_update:${event.updateId}:${userId}`,
          }),
        ),
      )
    } catch (error) {
      console.error(
        "[notifications] failed to handle product.update.published",
        { error, event },
      )
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
