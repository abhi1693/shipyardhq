import prisma from "@/lib/prisma"
import { on, publish } from "@/lib/server/events"

// Keeps ProductAnalytics.upvotes in sync with upvote/unupvote actions
on("product.upvoted", async ({ productId }) => {
  try {
    await prisma.productAnalytics.upsert({
      where: { productId },
      update: { upvotes: { increment: 1 } },
      create: { productId, upvotes: 1, clicks: 0 },
    })
  } catch (err) {
    console.error("[analytics] increment upvotes failed:", err)
  }
})

on("product.downvoted", async ({ productId }) => {
  try {
    await prisma.productAnalytics.upsert({
      where: { productId },
      update: { upvotes: { decrement: 1 } },
      create: { productId, upvotes: 0, clicks: 0 },
    })
  } catch (err) {
    console.error("[analytics] decrement upvotes failed:", err)
  }
})

// Optional helpers to publish events
export async function trackProductUpvoted(productId: string, userId: string) {
  await publish("product.upvoted", { productId, userId })
}

export async function trackProductDownvoted(productId: string, userId: string) {
  await publish("product.downvoted", { productId, userId })
}
