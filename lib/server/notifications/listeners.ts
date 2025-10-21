import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  memberProductOverviewPath,
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
      const message = `${actorName} upvoted ${product.name}`

      await createNotification({
        userId: product.userId,
        type: NotificationType.product_upvote,
        message,
        metadata: {
          actorUserId: actor.id,
          actorName,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          upvoteId: event.upvoteId,
          occurredAt: event.occurredAt.toISOString(),
          href: memberProductOverviewPath(product.slug),
          publicHref: productPath(product.slug),
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
      const message = `New review on ${product.name} by ${reviewerName}`

      await createNotification({
        userId: ownerUserId,
        type: NotificationType.product_review,
        message,
        metadata: {
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          reviewerUserId: reviewer.id,
          reviewerName,
          reviewId: event.reviewId,
          rating: event.rating,
          messageLength: event.messageLength,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
          href: memberProductOverviewPath(product.slug),
          publicHref: productPath(product.slug),
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
      const pointsLabel =
        event.rewardAmount === 1
          ? "1 point"
          : `${event.rewardAmount} points`
      const reason = event.ruleName?.trim() || "your activity"
      const message = `You earned ${pointsLabel} for ${reason}.`

      const metadata: Record<string, unknown> = {
        transactionId: event.transactionId,
        ruleKey: event.ruleKey,
        ruleName: event.ruleName,
        rewardAmount: event.rewardAmount,
        balanceAfter: event.balanceAfter,
        sourceType: event.sourceType ?? null,
        sourceId: event.sourceId ?? null,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        productId: event.productId ?? null,
        metadata: event.metadata ?? null,
        awardedAt: event.createdAt.toISOString(),
        href: MEMBER_REWARDS_PATH,
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
