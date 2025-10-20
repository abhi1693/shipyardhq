import prisma from "@/lib/prisma"
import { dispatchEventAsync, registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import type { ProductTrafficPayload } from "@/types/analytics"

// Registers a listener that persists product traffic payloads without blocking callers.
type ProductTrafficEventPayload = ProductTrafficPayload & {
  __enqueuedAt?: Date
}

registerEventHandler({
  event: APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC,
  id: "analytics.record-product-traffic",
  mode: "async",
  queue: "default",
  handler: async (payload: ProductTrafficEventPayload) => {
    try {
      console.debug("[analytics] product-traffic handler start", {
        productId: payload.productId,
        path: payload.path,
      })
      const createdAt = payload.__enqueuedAt
        ? new Date(payload.__enqueuedAt)
        : new Date()
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
          createdAt,
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
  dispatchEventAsync(APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC, payload, {
    context: { productId: payload.productId, path: payload.path },
  })
}
