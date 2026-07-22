import { beforeEach, describe, expect, it, vi } from "vitest"

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }))

vi.mock("@/lib/prisma", () => ({
  default: {
    productAnalytics: { upsert },
  },
}))

import { recordProductWebsiteClick } from "@/lib/server/analytics/productWebsiteClicks"

describe("product website click analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upsert.mockResolvedValue({ websiteClicks: 1 })
  })

  it("increments a privacy-safe aggregate instead of storing a raw event", async () => {
    await recordProductWebsiteClick("product_1")

    expect(upsert).toHaveBeenCalledWith({
      where: { productId: "product_1" },
      create: {
        productId: "product_1",
        websiteClicks: 1,
      },
      update: {
        websiteClicks: { increment: 1 },
      },
      select: { websiteClicks: true },
    })
  })
})
