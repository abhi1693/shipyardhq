import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(async (operations: any[]) => Promise.all(operations)),
    productAnalytics: {
      upsert: vi.fn(async () => ({})),
    },
    productClickEvent: {
      create: vi.fn(async () => ({})),
    },
    productTrafficEvent: {
      create: vi.fn(async () => ({})),
    },
  },
}))

import prisma from "@/lib/prisma"
import { publish } from "@/lib/server/events"
import { trackProductClicked } from "@/lib/server/analytics/productClicks"
import { trackProductTraffic } from "@/lib/server/analytics/productTraffic"
import "@/lib/server/analytics/productClicks"
import "@/lib/server/analytics/productVotes"
import "@/lib/server/analytics/productTraffic"

describe("analytics listeners", () => {
  beforeEach(() => {
    ;(prisma.$transaction as any).mockClear()
    ;(prisma.productAnalytics.upsert as any).mockClear()
    ;(prisma.productClickEvent.create as any).mockClear()
    ;(prisma.productTrafficEvent.create as any).mockClear()
  })

  it("increments clicks on product.clicked", async () => {
    await publish("product.clicked", { productId: "p1" })
    expect(prisma.productClickEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: "p1", device: "unknown" }),
    })
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: "p1" },
      update: { clicks: { increment: 1 } },
      create: { productId: "p1", upvotes: 0, clicks: 1 },
      select: { productId: true },
    })
  })

  it("helper trackProductClicked publishes event", async () => {
    ;(prisma.productAnalytics.upsert as any).mockClear()
    await trackProductClicked("p1", {
      device: "mobile",
      referrer: "https://example.com",
      browser: "Safari",
    })
    expect(prisma.productAnalytics.upsert).toHaveBeenCalled()
    expect(prisma.productClickEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: "p1",
        device: "mobile",
        referrer: "https://example.com",
        browser: "Safari",
      }),
    })
  })

  it("increments and decrements upvotes on (down)vote", async () => {
    await publish("product.upvoted", { productId: "p2", userId: "u" })
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: "p2" },
      update: { upvotes: { increment: 1 } },
      create: { productId: "p2", upvotes: 1, clicks: 0 },
      select: { productId: true },
    })
    ;(prisma.productAnalytics.upsert as any).mockClear()
    await publish("product.downvoted", { productId: "p2", userId: "u" })
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: "p2" },
      update: { upvotes: { decrement: 1 } },
      create: { productId: "p2", upvotes: 0, clicks: 0 },
      select: { productId: true },
    })
  })

  it("logs errors when prisma upsert fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    ;(prisma.productAnalytics.upsert as any).mockRejectedValueOnce(
      new Error("x"),
    )
    await publish("product.clicked", { productId: "p3" })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    ;(prisma.productAnalytics.upsert as any).mockResolvedValue({})
  })

  it("logs error on upvote/downvote failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    ;(prisma.productAnalytics.upsert as any).mockRejectedValueOnce(
      new Error("x"),
    )
    await publish("product.upvoted", { productId: "p4", userId: "u" })
    ;(prisma.productAnalytics.upsert as any).mockRejectedValueOnce(
      new Error("y"),
    )
    await publish("product.downvoted", { productId: "p4", userId: "u" })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    ;(prisma.productAnalytics.upsert as any).mockResolvedValue({})
  })

  it("persists product traffic payloads", async () => {
    const payload = {
      productId: "p5",
      path: "/products/test",
      referrer: "https://example.com",
      userAgent: "Mozilla/5.0",
      device: "desktop" as const,
      browser: "Chrome",
      os: "macOS",
      country: "US",
      region: "CA",
      city: "SF",
      ipHash: "hash",
    }

    await publish("analytics.product-traffic", payload)
    expect(prisma.productTrafficEvent.create).toHaveBeenCalledWith({
      data: {
        productId: payload.productId,
        path: payload.path,
        referrer: payload.referrer,
        userAgent: payload.userAgent,
        device: payload.device,
        browser: payload.browser,
        os: payload.os,
        country: payload.country,
        region: payload.region,
        city: payload.city,
        ipHash: payload.ipHash,
      },
    })
  })

  it("helper trackProductTraffic publishes event", async () => {
    await trackProductTraffic({
      productId: "p6",
      path: "/p",
      device: "mobile",
    })
    expect(prisma.productTrafficEvent.create).toHaveBeenCalled()
  })
})
