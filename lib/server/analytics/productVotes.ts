import prisma from "@/lib/prisma"
import {
  registerEventHandler,
  dispatchEvent,
  type ProductDownvotedEvent,
  type ProductUpvotedEvent,
} from "@/lib/server/events"
import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"

// Keeps ProductAnalytics.upvotes in sync with upvote/unupvote actions
registerEventHandler({
  event: "product.upvoted",
  id: "analytics.increment-upvotes",
  handler: async ({ productId }) => {
    try {
      await prisma.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { increment: 1 } },
        create: { productId, upvotes: 1, clicks: 0 },
        select: { productId: true },
      })
      revalidateProduct(productId)
      revalidateLeaderboard()
    } catch (err) {
      console.error("[analytics] increment upvotes failed:", err)
    }
  },
})

registerEventHandler({
  event: "product.downvoted",
  id: "analytics.decrement-upvotes",
  handler: async ({ productId }) => {
    try {
      await prisma.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { decrement: 1 } },
        create: { productId, upvotes: 0, clicks: 0 },
        select: { productId: true },
      })
      revalidateProduct(productId)
      revalidateLeaderboard()
    } catch (err) {
      console.error("[analytics] decrement upvotes failed:", err)
    }
  },
})

// Optional helpers to publish events
export async function trackProductUpvoted(event: ProductUpvotedEvent) {
  await dispatchEvent("product.upvoted", event)
}

export async function trackProductDownvoted(event: ProductDownvotedEvent) {
  await dispatchEvent("product.downvoted", event)
}
