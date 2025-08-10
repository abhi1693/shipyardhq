import prisma from "@/lib/prisma"
import { on, publish } from "@/lib/server/events"

// Register listeners related to product click analytics.
// Import this module anywhere server-side to ensure handlers are active.
on("product.clicked", async ({ productId }) => {
  try {
    await prisma.productAnalytics.upsert({
      where: { productId },
      update: { clicks: { increment: 1 } },
      create: { productId, views: 0, upvotes: 0, clicks: 1 },
    })
  } catch (err) {
    console.error("[analytics] increment product clicks failed:", err)
  }
})

// Optional helper to publish a click event from server code
export async function trackProductClicked(productId: string) {
  await publish("product.clicked", { productId })
}

