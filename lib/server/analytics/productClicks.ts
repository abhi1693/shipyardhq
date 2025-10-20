import prisma from "@/lib/prisma"
import {
  dispatchEventAsync,
  registerEventHandler,
  type ProductClickMetadata,
} from "@/lib/server/events"
import { revalidateProducts } from "@/lib/cache/revalidate"
import type { DeviceCategory } from "@/types/analytics"

// Register listeners related to product click analytics.
// Import this module anywhere server-side to ensure handlers are active.
type ProductClickedEventPayload = {
  productId: string
  metadata?: ProductClickMetadata
  __enqueuedAt?: Date
}

registerEventHandler({
  event: "product.clicked",
  id: "analytics.record-product-click",
  mode: "async",
  handler: async (payload: ProductClickedEventPayload) => {
    try {
      const { productId, metadata } = payload
      const device: DeviceCategory = metadata?.device ?? "unknown"
      console.debug("[analytics] product.clicked handler", {
        productId,
        device,
      })
      const createData = {
        productId,
        referrer: metadata?.referrer ?? null,
        userAgent: metadata?.userAgent ?? null,
        device,
        browser: metadata?.browser ?? null,
        os: metadata?.os ?? null,
        country: metadata?.country ?? null,
        region: metadata?.region ?? null,
        city: metadata?.city ?? null,
        ipHash: metadata?.ipHash ?? null,
        createdAt: payload.__enqueuedAt ? new Date(payload.__enqueuedAt) : undefined,
      }
      await prisma.$transaction([
        prisma.productClickEvent.create({ data: createData }),
        prisma.productAnalytics.upsert({
          where: { productId },
          update: { clicks: { increment: 1 } },
          create: { productId, upvotes: 0, clicks: 1 },
          select: { productId: true },
        }),
      ])
      // Keep browse/trending pages reasonably fresh
      revalidateProducts()
      console.debug("[analytics] product.clicked handler completed", {
        productId,
      })
    } catch (err) {
      console.error("[analytics] increment product clicks failed:", err)
    }
  },
})

// Optional helper to publish a click event from server code
export async function trackProductClicked(
  productId: string,
  metadata: ProductClickMetadata = {},
) {
  console.debug("[analytics] trackProductClicked invoked", {
    productId,
    hasMetadata: Boolean(metadata && Object.keys(metadata).length),
  })
  dispatchEventAsync(
    "product.clicked",
    { productId, metadata },
    { context: { productId } },
  )
}
