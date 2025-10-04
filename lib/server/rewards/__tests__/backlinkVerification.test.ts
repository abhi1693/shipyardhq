import { describe, it, expect, beforeEach, afterAll, vi } from "vitest"

const mocks = vi.hoisted(() => {
  return {
    findMany: vi.fn(),
    update: vi.fn(),
    awardRewards: vi.fn(),
    fetch: vi.fn(),
  }
})

vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findMany: mocks.findMany },
    productVerification: { update: mocks.update },
  },
}))

vi.mock("@/lib/rewards/engine", () => ({
  awardRewards: mocks.awardRewards,
}))

vi.mock("@/lib/email/utils", () => ({
  getAppBaseUrl: () => "https://shipyardhq.dev",
}))

import { runBacklinkVerification } from "../backlinkVerification"
import { awardRewards } from "@/lib/rewards/engine"
import prisma from "@/lib/prisma"

const mockedUpdate = vi.mocked(prisma.productVerification.update)
const mockedAwardRewards = vi.mocked(awardRewards)

const originalFetch = global.fetch

beforeEach(() => {
  mocks.findMany.mockReset()
  mocks.update.mockReset()
  mocks.awardRewards.mockReset()
  mocks.fetch.mockReset()
  global.fetch = mocks.fetch as unknown as typeof global.fetch
})

afterAll(() => {
  global.fetch = originalFetch
})

describe("runBacklinkVerification", () => {
  it("marks backlinks as verified and awards rewards", async () => {
    const html =
      '<html><body><a href="https://shipyardhq.dev/products/alpha">Badge</a></body></html>'

    mocks.findMany.mockResolvedValue([
      {
        id: "prod-1",
        slug: "alpha",
        websiteUrl: "https://alpha.dev",
        userId: "user-1",
        verification: {
          id: "ver-1",
          backlinkIsVerified: false,
          backlinkVerifiedAt: null,
          backlinkFoundUrl: null,
          backlinkLastCheckedAt: null,
          backlinkLastError: null,
        },
      },
    ])

    mocks.fetch.mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    )

    const now = new Date("2025-02-11T05:00:00Z")
    const summary = await runBacklinkVerification(now)

    expect(summary.checked).toBe(1)
    expect(summary.verified).toBe(1)
    expect(summary.newlyVerified).toBe(1)
    expect(summary.awarded).toBe(1)
    expect(summary.errors).toBe(0)

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "ver-1" },
      data: expect.objectContaining({
        backlinkIsVerified: true,
        backlinkFoundUrl: "https://shipyardhq.dev/products/alpha",
        backlinkVerifiedAt: now,
      }),
    })

    expect(mockedAwardRewards).toHaveBeenCalledWith(
      "user-1",
      "rewards.backlink.verify",
      expect.objectContaining({
        eventId: "backlink:prod-1",
        productId: "prod-1",
        metadata: expect.objectContaining({ backlinkUrl: expect.any(String) }),
      }),
    )
  })

  it("records missing backlinks without awarding", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "prod-2",
        slug: "beta",
        websiteUrl: "https://beta.dev",
        userId: "user-2",
        verification: {
          id: "ver-2",
          backlinkIsVerified: false,
          backlinkVerifiedAt: null,
          backlinkFoundUrl: null,
          backlinkLastCheckedAt: null,
          backlinkLastError: null,
        },
      },
    ])

    mocks.fetch.mockResolvedValue(
      new Response("<html><body>No backlink here</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    )

    const summary = await runBacklinkVerification()

    expect(summary.checked).toBe(1)
    expect(summary.missing).toBe(1)
    expect(summary.awarded).toBe(0)
    expect(mockedAwardRewards).not.toHaveBeenCalled()
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "ver-2" },
      data: expect.objectContaining({
        backlinkIsVerified: false,
        backlinkLastError: "Backlink not found in fetched HTML",
      }),
    })
  })

  it("captures fetch errors as failures", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "prod-3",
        slug: "gamma",
        websiteUrl: "https://gamma.dev",
        userId: "user-3",
        verification: {
          id: "ver-3",
          backlinkIsVerified: false,
          backlinkVerifiedAt: null,
          backlinkFoundUrl: null,
          backlinkLastCheckedAt: null,
          backlinkLastError: null,
        },
      },
    ])

    mocks.fetch.mockRejectedValue(new Error("timeout"))

    const summary = await runBacklinkVerification()

    expect(summary.checked).toBe(1)
    expect(summary.errors).toBe(1)
    expect(summary.failures[0]).toEqual({
      productId: "prod-3",
      reason: "timeout",
    })
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "ver-3" },
      data: expect.objectContaining({
        backlinkIsVerified: false,
        backlinkLastError: "timeout",
      }),
    })
  })
})
