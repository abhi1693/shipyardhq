import prisma from "@/lib/prisma"
import { on, publish, type ProductClickMetadata } from "@/lib/server/events"
import { revalidateProducts } from "@/lib/cache/revalidate"
import type { DeviceCategory } from "@/types/analytics"

// Register listeners related to product click analytics.
// Import this module anywhere server-side to ensure handlers are active.
on("product.clicked", async ({ productId, metadata }) => {
  try {
    const device: DeviceCategory = metadata?.device ?? "unknown"
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
  } catch (err) {
    console.error("[analytics] increment product clicks failed:", err)
  }
})

// Optional helper to publish a click event from server code
export async function trackProductClicked(
  productId: string,
  metadata: ProductClickMetadata = {},
) {
  await publish("product.clicked", { productId, metadata })
}
