import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findFirst: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  userPlanPurchase: {
    findFirst: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import { organizationHasAdvancedAnalytics } from "@/lib/server/analytics/organizationAccess"

describe("organizationHasAdvancedAnalytics", () => {
  beforeEach(() => {
    prismaMock.product.findFirst.mockReset()
    prismaMock.organization.findUnique.mockReset()
    prismaMock.userPlanPurchase.findFirst.mockReset()
  })

  it("returns true when a product plan includes advanced analytics", async () => {
    prismaMock.product.findFirst.mockResolvedValue({
      plan: {
        assignments: [
          { enabled: true, feature: { key: "analytics.advanced" } },
        ],
      },
    })
    prismaMock.organization.findUnique.mockResolvedValue({ ownerUserId: "owner" })

    const result = await organizationHasAdvancedAnalytics("org-1")

    expect(result).toBe(true)
    expect(prismaMock.userPlanPurchase.findFirst).not.toHaveBeenCalled()
  })

  it("checks owner subscription when no product plan qualifies", async () => {
    prismaMock.product.findFirst.mockResolvedValue({ plan: { assignments: [] } })
    prismaMock.organization.findUnique.mockResolvedValue({ ownerUserId: "owner" })
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue({ id: "purchase-1" })

    const result = await organizationHasAdvancedAnalytics("org-2")

    expect(result).toBe(true)
  })

  it("returns false when no owner or qualifying purchase exists", async () => {
    prismaMock.product.findFirst.mockResolvedValue(null)
    prismaMock.organization.findUnique.mockResolvedValue({ ownerUserId: null })

    const result = await organizationHasAdvancedAnalytics("org-3")

    expect(result).toBe(false)
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
})
