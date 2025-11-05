import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"
import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"

// Keeps ProductAnalytics.upvotes in sync with upvote actions
registerEventHandler({
  event: "product.upvoted",
  id: "analytics.increment-upvotes",
  queue: "high",
  handler: async ({ productId }) => {
    try {
      await prisma.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { increment: 1 } },
        create: { productId, upvotes: 1, clicks: 0 },
        select: { productId: true },
      })
      revalidateProduct(productId, "revalidate")
      revalidateLeaderboard("revalidate")
    } catch (err) {
      console.error("[analytics] increment upvotes failed:", err)
    }
  },
})
