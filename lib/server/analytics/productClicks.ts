import prisma from "@/lib/prisma"
import { on, publish } from "@/lib/server/events"
import { revalidateProducts } from "@/lib/cache/revalidate"

// Register listeners related to product click analytics.
// Import this module anywhere server-side to ensure handlers are active.
on("product.clicked", async ({ productId }) => {
  try {
    await prisma.productAnalytics.upsert({
      where: { productId },
      update: { clicks: { increment: 1 } },
      create: { productId, upvotes: 0, clicks: 1 },
      select: { productId: true },
    })
    // Keep browse/trending pages reasonably fresh
    revalidateProducts()
  } catch (err) {
    console.error("[analytics] increment product clicks failed:", err)
  }
})

// Optional helper to publish a click event from server code
export async function trackProductClicked(productId: string) {
  await publish("product.clicked", { productId })
}
