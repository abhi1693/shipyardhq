import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.hoisted(() => vi.fn())
const prismaMock = vi.hoisted(() => ({
  product: {
    findFirst: vi.fn(),
  },
  userPlanPurchase: {
    findFirst: vi.fn(),
  },
  organizationMembership: {
    findFirst: vi.fn(),
  },
  featureEntitlement: {
    findFirst: vi.fn(),
  },
}))
const getActiveUserMock = vi.hoisted(() => vi.fn())

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: getActiveUserMock,
}))

import { memberHasFeature, requireMemberFeature } from "@/lib/memberFeatures"

const activeUser = {
  id: "user-1",
  email: "user@example.com",
  role: "member",
  status: "active",
  firstName: "Ada",
  lastName: "Lovelace",
}

beforeEach(() => {
  authMock.mockReset()
  prismaMock.product.findFirst.mockReset()
  prismaMock.userPlanPurchase.findFirst.mockReset()
  prismaMock.organizationMembership.findFirst.mockReset()
  prismaMock.featureEntitlement.findFirst.mockReset()
  getActiveUserMock.mockReset()
})

describe("memberHasFeature", () => {
  it("returns false when user is not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null })

    const result = await memberHasFeature("featured")
    expect(result).toBe(false)
    expect(getActiveUserMock).not.toHaveBeenCalled()
  })

  it("returns true when an owned product grants the feature", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user" })
    getActiveUserMock.mockResolvedValue(activeUser)
    prismaMock.product.findFirst.mockResolvedValue({ id: "product-1" })
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)

    const result = await memberHasFeature("featured")
    expect(result).toBe(true)
  })

  it("returns true when a plan purchase grants the feature", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user" })
    getActiveUserMock.mockResolvedValue(activeUser)
    prismaMock.product.findFirst.mockResolvedValue(null)
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue({
      id: "purchase-1",
    })
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)

    const result = await memberHasFeature("featured")
    expect(result).toBe(true)
  })

  it("checks organization membership for organization feature", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user" })
    getActiveUserMock.mockResolvedValue(activeUser)
    prismaMock.product.findFirst.mockResolvedValue(null)
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue(null)
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-1",
    })

    const result = await memberHasFeature("organization")
    expect(result).toBe(true)
  })

  it("returns false on errors", async () => {
    authMock.mockRejectedValue(new Error("boom"))

    const result = await memberHasFeature("featured")
    expect(result).toBe(false)
  })
})

describe("requireMemberFeature", () => {
  it("returns ok when feature available", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user" })
    getActiveUserMock.mockResolvedValue(activeUser)
    prismaMock.product.findFirst.mockResolvedValue({ id: "product-1" })

    const result = await requireMemberFeature("featured")
    expect(result).toEqual({ ok: true })
  })

  it("returns detailed reason when missing feature", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user" })
    getActiveUserMock.mockResolvedValue(activeUser)
    prismaMock.product.findFirst.mockResolvedValue(null)
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue(null)
    prismaMock.featureEntitlement.findFirst.mockResolvedValue(null)
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null)

    const result = await requireMemberFeature("featured")
    expect(result).toEqual({
      ok: false,
      reason: "Missing required feature: featured",
    })
  })
})
