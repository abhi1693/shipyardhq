import prisma from "@/lib/prisma"
import { on, publish } from "@/lib/server/events"
import type { ProductTrafficPayload } from "@/types/analytics"

// Registers a listener that persists product traffic payloads without blocking callers.
on("analytics.product-traffic", async (payload) => {
  try {
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
  } catch (err) {
    console.error("[analytics] failed to persist product traffic", err)
  }
})

export async function trackProductTraffic(payload: ProductTrafficPayload) {
  await publish("analytics.product-traffic", payload)
}
