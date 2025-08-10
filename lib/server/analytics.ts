import prisma from "@/lib/prisma"
import { on } from "@/lib/server/events"

// Increment click counters when a product is clicked via tracked links
on("product.clicked", async ({ productId }) => {
  try {
    await prisma.productAnalytics.upsert({
      where: { productId },
      update: { clicks: { increment: 1 } },
      create: { productId, views: 0, upvotes: 0, clicks: 1 },
    })
  } catch (err) {
    console.error("Failed to increment product clicks:", err)
  }
})
