import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  memberProductPath,
  MEMBER_REWARDS_PATH,
  productPath,
} from "@/lib/routes"
import {
  createNotification,
} from "@/lib/server/notifications/service"
import {
  NotificationType,
  type Prisma,
} from "@/lib/vendor/prisma/client"

const USER_NAME_FALLBACK = "Shipyard member"

const PRODUCT_UPDATE_NOTIFICATION_TYPE =
  (NotificationType as Record<
    string,
    (typeof NotificationType)[keyof typeof NotificationType] | undefined
  >).product_update ?? NotificationType.system

type BasicUser = {
  id: string
  firstName: string | null
  lastName: string | null
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
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect

registerEventHandler({
  event: APP_EVENTS.PRODUCT_UPVOTED,
  id: "notifications.product-upvote",
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

      const actorName = formatUserName(actor)
      const productName = formatProductName(product)
      const message = `${actorName} upvoted ${productName}`

      await createNotification({
        userId: product.userId,
        type: NotificationType.product_upvote,
        message,
        metadata: {
          actorUserId: actor.id,
          actorName,
          productId: product.id,
          productSlug: product.slug,
          productName,
          upvoteId: event.upvoteId,
          occurredAt: event.occurredAt.toISOString(),
          href: memberProductPath(product.slug),
        },
      })
    } catch (error) {
      console.error(
        "[notifications] failed to handle product.upvoted",
        { error, event },
      )
    }
  },
})

registerEventHandler({
  event: APP_EVENTS.PRODUCT_REVIEWED,
  id: "notifications.product-reviewed",
  queue: "low",
  handler: async (event) => {
    try {
      const [product, reviewer] = await Promise.all([
        loadProduct(event.productId),
        loadUser(event.userId),
      ])

      if (!product) return
      if (!reviewer) return

      const ownerUserId =
        event.productOwnerId ?? product.userId
      if (!ownerUserId) return
      if (ownerUserId === reviewer.id) return

      const reviewerName = formatUserName(reviewer)
      const productName = formatProductName(product)
      const message = `New review on ${productName} by ${reviewerName}`

      await createNotification({
        userId: ownerUserId,
        type: NotificationType.product_review,
        message,
        metadata: {
          productId: product.id,
          productSlug: product.slug,
          productName,
          reviewerUserId: reviewer.id,
          reviewerName,
          reviewId: event.reviewId,
          rating: event.rating,
          messageLength: event.messageLength,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
          href: memberProductPath(product.slug),
        },
      })
    } catch (error) {
      console.error(
        "[notifications] failed to handle product.reviewed",
        { error, event },
      )
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
        event.rewardAmount === 1
          ? "1 point"
          : `${event.rewardAmount} points`
      const reason = normalizeReason(event.ruleName)
      const reasonIncludesProduct =
        productName &&
        reason.toLowerCase().includes(productName.toLowerCase())
      const message = `You earned ${pointsLabel} for ${reason}${
        productName && !reasonIncludesProduct ? ` on ${productName}` : ""
      }.`

      const metadata: Record<string, unknown> = {
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
      console.error(
        "[notifications] failed to handle rewards.awarded",
        { error, event },
      )
    }
  },
})

registerEventHandler({
  event: APP_EVENTS.PRODUCT_UPDATE_PUBLISHED,
  id: "notifications.product-update-published",
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

      const metadataBase: Record<string, unknown> = {
        productId: event.productId,
        productSlug: event.productSlug ?? null,
        productName: event.productName ?? null,
        updateId: event.updateId,
        updateTitle: event.updateTitle,
        updateSummary: event.updateSummary ?? null,
        publishedAt: publishedAtIso,
        href,
        publicHref: href,
        notificationKind: "product_update",
      }

      await Promise.all(
        Array.from(userIds).map((userId) =>
          createNotification({
            userId,
            type: PRODUCT_UPDATE_NOTIFICATION_TYPE,
            message,
            metadata: metadataBase,
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

async function loadProduct(
  productId: string,
): Promise<BasicProduct | null> {
  if (!productId) return null
  return prisma.product.findUnique({
    where: { id: productId },
    select: productSelector,
  })
}

async function loadUser(
  userId: string,
): Promise<BasicUser | null> {
  if (!userId) return null
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelector,
  })
}

function formatUserName(
  user: BasicUser | null,
): string {
  if (!user) return USER_NAME_FALLBACK
  const parts = [
    user.firstName?.trim(),
    user.lastName?.trim(),
  ].filter(Boolean) as string[]

  if (!parts.length) return USER_NAME_FALLBACK
  return parts.join(" ")
}

function formatProductName(
  product: BasicProduct | null,
): string {
  if (!product) return "your product"
  const name = product.name?.trim()
  if (name && name.length > 0) {
    return name
  }
  return product.slug?.trim() || "your product"
}

function toMetadataRecord(
  metadata: unknown,
): Record<string, unknown> | null {
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
