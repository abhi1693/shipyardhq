import prisma from "@/lib/prisma"
import { dispatchEventAsync, registerEventHandler } from "@/lib/server/events"
import type { ProductTrafficPayload } from "@/types/analytics"

// Registers a listener that persists product traffic payloads without blocking callers.
registerEventHandler({
  event: "analytics.product-traffic",
  id: "analytics.record-product-traffic",
  mode: "async",
  handler: async (payload) => {
    try {
      console.debug("[analytics] product-traffic handler start", {
        productId: payload.productId,
        path: payload.path,
      })
      await prisma.productTrafficEvent.create({
        data: {
          productId: payload.productId,
          path: payload.path,
          referrer: payload.referrer ?? null,
          userAgent: payload.userAgent ?? null,
          device: payload.device ?? "unknown",
          browser: payload.browser ?? null,
          os: payload.os ?? null,
          country: payload.country ?? null,
          region: payload.region ?? null,
          city: payload.city ?? null,
          ipHash: payload.ipHash ?? null,
        },
      })
      console.debug("[analytics] product-traffic handler end", {
        productId: payload.productId,
        path: payload.path,
      })
    } catch (err) {
      console.error("[analytics] failed to persist product traffic", err)
    }
  },
})

export async function trackProductTraffic(payload: ProductTrafficPayload) {
  console.debug("[analytics] trackProductTraffic invoked", {
    productId: payload.productId,
    path: payload.path,
  })
  dispatchEventAsync(
    "analytics.product-traffic",
    payload,
    { context: { productId: payload.productId, path: payload.path } },
  )
}
