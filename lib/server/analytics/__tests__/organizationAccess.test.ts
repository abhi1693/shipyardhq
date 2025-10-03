import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findFirst: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  featureEntitlement: {
    findFirst: vi.fn(),
  },
  userPlanPurchase: {
    findFirst: vi.fn(),
  },
}))

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/cache", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/server/cache")>(
      "@/lib/server/cache",
    )
  return {
    ...actual,
    cacheHit: cacheHitMock,
    cacheMiss: cacheMissMock,
  }
})

import { organizationHasAdvancedAnalytics } from "@/lib/server/analytics/organizationAccess"

describe("organizationHasAdvancedAnalytics", () => {
  beforeEach(() => {
    prismaMock.product.findFirst.mockReset()
    prismaMock.organization.findUnique.mockReset()
    prismaMock.featureEntitlement.findFirst.mockReset()
    prismaMock.userPlanPurchase.findFirst.mockReset()
    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(undefined)
    cacheMissMock.mockResolvedValue(undefined)
  })

  it("returns true when a product plan includes advanced analytics", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
      plan: {
        assignments: [
          { enabled: true, feature: { key: "analytics.advanced" } },
        ],
      },
    })
    prismaMock.organization.findUnique.mockResolvedValue({
      ownerUserId: "owner",
    })
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)

    const result = await organizationHasAdvancedAnalytics("org-1")

    expect(result).toBe(true)
    expect(prismaMock.userPlanPurchase.findFirst).not.toHaveBeenCalled()
    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:organizationAccess"),
        ttlSeconds: 60,
      }),
    )
  })

  it("checks owner subscription when no product plan qualifies", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
      plan: { assignments: [] },
    })
    prismaMock.organization.findUnique.mockResolvedValue({
      ownerUserId: "owner",
    })
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue({
      id: "purchase-1",
    })

    const result = await organizationHasAdvancedAnalytics("org-2")

    expect(result).toBe(true)
    expect(cacheMissMock).toHaveBeenCalled()
  })

  it("returns false when no owner or qualifying purchase exists", async () => {
    prismaMock.product.findFirst.mockResolvedValue(null)
    prismaMock.organization.findUnique.mockResolvedValue({ ownerUserId: null })
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)

    const result = await organizationHasAdvancedAnalytics("org-3")

    expect(result).toBe(false)
    expect(cacheMissMock).toHaveBeenCalled()
  })

  it("logs and returns false on errors", async () => {
    prismaMock.product.findFirst.mockRejectedValueOnce(new Error("db down"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await organizationHasAdvancedAnalytics("org-4")

    expect(result).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith(
      "[organizationHasAdvancedAnalytics] access check failed",
      expect.any(Error),
    )

    errorSpy.mockRestore()
  })

  it("returns cached response when available", async () => {
    cacheHitMock.mockResolvedValueOnce(true)

    const result = await organizationHasAdvancedAnalytics("org-5")

    expect(result).toBe(true)
    expect(prismaMock.product.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.featureEntitlement.findFirst).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
  })

  it("grants access when an active entitlement exists", async () => {
    prismaMock.product.findFirst.mockResolvedValue(null)
    prismaMock.organization.findUnique.mockResolvedValue({ ownerUserId: "owner" })
    prismaMock.featureEntitlement.findFirst.mockResolvedValue({ id: "ent-1" })

    const result = await organizationHasAdvancedAnalytics("org-6")

    expect(result).toBe(true)
    expect(prismaMock.userPlanPurchase.findFirst).not.toHaveBeenCalled()
  })
})
