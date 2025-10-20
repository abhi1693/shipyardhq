import { describe, it, expect, vi, beforeEach } from "vitest"

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (operations: any[]) => Promise.all(operations)),
  $executeRaw: vi.fn(async () => undefined),
  productAnalytics: {
    upsert: vi.fn(async () => ({})),
  },
  productClickEvent: {
    create: vi.fn(async () => ({})),
  },
  productTrafficEvent: {
    create: vi.fn(async () => ({})),
  },
}))

const enqueueMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/events/queueClient", () => ({
  enqueueEvent: enqueueMock,
  dequeueEnvelopeBatch: vi.fn(async () => []),
  requeueEnvelope: vi.fn(async () => undefined),
}))

import prisma from "@/lib/prisma"
import { dispatchEvent, resolveRegisteredHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import * as eventsModule from "@/lib/server/events"
import { trackProductClicked } from "@/lib/server/analytics/productClicks"
import { trackProductTraffic } from "@/lib/server/analytics/productTraffic"
import "@/lib/server/analytics/productClicks"
import "@/lib/server/analytics/productVotes"
import "@/lib/server/analytics/productTraffic"

const makeVoteEvent = (productId: string, userId: string) => ({
  productId,
  userId,
  upvoteId: `${productId}:${userId}`,
  occurredAt: new Date(),
})

describe("analytics listeners", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockClear()
    prismaMock.$executeRaw.mockClear()
    prismaMock.productAnalytics.upsert.mockClear()
    prismaMock.productClickEvent.create.mockClear()
    prismaMock.productTrafficEvent.create.mockClear()
    enqueueMock.mockClear()
  })

  it("increments clicks on product.clicked", async () => {
    const handler = resolveRegisteredHandler(
      "product.clicked",
      "analytics.record-product-click",
    )
    expect(handler).toBeDefined()
    const enqueuedAt = new Date("2025-03-18T10:00:00.000Z")
    const payload: any = { productId: "p1" }
    Object.defineProperty(payload, "__enqueuedAt", {
      value: enqueuedAt,
      enumerable: false,
    })
    await handler?.handler(payload)

    expect(prisma.productClickEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: "p1",
        device: "unknown",
        createdAt: enqueuedAt,
      }),
    })
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: "p1" },
      update: { clicks: { increment: 1 } },
      create: { productId: "p1", upvotes: 0, clicks: 1 },
      select: { productId: true },
    })
  })

  it("dispatching product.clicked enqueues async work", async () => {
    await dispatchEvent("product.clicked", { productId: "async-1" } as any)
    expect(enqueueMock).toHaveBeenCalledTimes(1)
    expect(enqueueMock).toHaveBeenCalledWith(expect.any(String))
  })

  it("dispatching analytics.product-traffic enqueues async work", async () => {
    await dispatchEvent(APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC, {
      productId: "async-traffic",
      path: "/test",
      device: "desktop",
    } as any)
    expect(enqueueMock).toHaveBeenCalledTimes(1)
    expect(enqueueMock).toHaveBeenCalledWith(expect.any(String))
  })

  it("helper trackProductClicked publishes event", async () => {
    const spy = vi
      .spyOn(eventsModule, "dispatchEvent")
      .mockResolvedValue(undefined)

    await trackProductClicked("p1", {
      device: "mobile",
      referrer: "https://example.com",
      browser: "Safari",
    })
    expect(spy).toHaveBeenCalledWith("product.clicked", {
      productId: "p1",
      metadata: {
        device: "mobile",
        referrer: "https://example.com",
        browser: "Safari",
      },
    })
    spy.mockRestore()
  })

  it("increments and decrements upvotes on (down)vote", async () => {
    const upvoteHandler = resolveRegisteredHandler(
      "product.upvoted",
      "analytics.increment-upvotes",
    )
    expect(upvoteHandler).toBeDefined()
    await upvoteHandler?.handler(makeVoteEvent("p2", "u") as any)
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: "p2" },
      update: { upvotes: { increment: 1 } },
      create: { productId: "p2", upvotes: 1, clicks: 0 },
      select: { productId: true },
    })
    prismaMock.productAnalytics.upsert.mockClear()
    const downvoteHandler = resolveRegisteredHandler(
      "product.downvoted",
      "analytics.decrement-upvotes",
    )
    expect(downvoteHandler).toBeDefined()
    await downvoteHandler?.handler(makeVoteEvent("p2", "u") as any)
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: "p2" },
      update: { upvotes: { decrement: 1 } },
      create: { productId: "p2", upvotes: 0, clicks: 0 },
      select: { productId: true },
    })
  })

  it("logs errors when prisma upsert fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    prismaMock.productAnalytics.upsert.mockRejectedValueOnce(new Error("x"))
    const clickHandler = resolveRegisteredHandler(
      "product.clicked",
      "analytics.record-product-click",
    )
    await clickHandler?.handler({ productId: "p3" } as any)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    prismaMock.productAnalytics.upsert.mockResolvedValue({})
  })

  it("logs error on upvote/downvote failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    prismaMock.productAnalytics.upsert.mockRejectedValueOnce(new Error("x"))
    const upvoteHandler = resolveRegisteredHandler(
      "product.upvoted",
      "analytics.increment-upvotes",
    )
    await upvoteHandler?.handler(makeVoteEvent("p4", "u") as any)
    prismaMock.productAnalytics.upsert.mockRejectedValueOnce(new Error("y"))
    const downvoteHandler = resolveRegisteredHandler(
      "product.downvoted",
      "analytics.decrement-upvotes",
    )
    await downvoteHandler?.handler(makeVoteEvent("p4", "u") as any)
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

    const handler = resolveRegisteredHandler(
      APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC,
      "analytics.record-product-traffic",
    )
    expect(handler).toBeDefined()
    const enqueuedAt = new Date("2025-03-18T05:00:00.000Z")
    Object.defineProperty(payload, "__enqueuedAt", {
      value: enqueuedAt,
      enumerable: false,
    })
    await handler?.handler(payload as any)
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
        createdAt: enqueuedAt,
      },
    })
  })

  it("helper trackProductTraffic publishes event", async () => {
    const spy = vi
      .spyOn(eventsModule, "dispatchEvent")
      .mockResolvedValue(undefined)

    await trackProductTraffic({
      productId: "p6",
      path: "/p",
      device: "mobile",
    })
    expect(spy).toHaveBeenCalledWith(APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC, {
      productId: "p6",
      path: "/p",
      device: "mobile",
    })
    spy.mockRestore()
  })
})
