import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.hoisted(() => vi.fn())
const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
  },
  organizationMembership: {
    findFirst: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  userPlanPurchase: {
    findFirst: vi.fn(),
  },
}))
const getActiveUserByClerkIdMock = vi.hoisted(() => vi.fn())
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
)
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("notFound")
  }),
)

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: getActiveUserByClerkIdMock,
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}))

import { requireManageableProduct } from "@/lib/server/productAccess"
import { memberProductsStatusPath } from "@/lib/routes"

const activeUser = {
  id: "user-1",
  email: "user@example.com",
  role: "member",
  status: "active",
  firstName: "Ada",
  lastName: "Lovelace",
}

describe("requireManageableProduct", () => {
  beforeEach(() => {
    authMock.mockReset()
    getActiveUserByClerkIdMock.mockReset()
    prismaMock.product.findUnique.mockReset()
    prismaMock.organizationMembership.findFirst.mockReset()
    prismaMock.organization.findUnique.mockReset()
    prismaMock.userPlanPurchase.findFirst.mockReset()
    redirectMock.mockClear()
    notFoundMock.mockClear()
  })

  it("redirects when user is not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null })

    await expect(requireManageableProduct("prod-unauth")).rejects.toThrow(
      `redirect:${memberProductsStatusPath("unauthorized")}`,
    )

    expect(getActiveUserByClerkIdMock).not.toHaveBeenCalled()
  })

  it("redirects when user is not active", async () => {
    authMock.mockResolvedValue({ userId: "clerk-1" })
    getActiveUserByClerkIdMock.mockResolvedValue(null)

    await expect(requireManageableProduct("prod-inactive")).rejects.toThrow(
      `redirect:${memberProductsStatusPath("unauthorized")}`,
    )
  })

  it("returns product when current user is the owner", async () => {
    authMock.mockResolvedValue({ userId: "clerk-owner" })
    getActiveUserByClerkIdMock.mockResolvedValue(activeUser)
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-1",
      name: "Test Product",
      slug: "test-product",
      userId: activeUser.id,
      organizationId: null,
    })

    const result = await requireManageableProduct("test-product")

    expect(result.product.slug).toBe("test-product")
    expect(result.currentUser.id).toBe(activeUser.id)
  })

  it("allows organization member access", async () => {
    authMock.mockResolvedValue({ userId: "clerk-member" })
    getActiveUserByClerkIdMock.mockResolvedValue(activeUser)
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-org",
      name: "Org Product",
      slug: "org-product",
      userId: "owner",
      organizationId: "org-1",
    })
    prismaMock.organizationMembership.findFirst.mockResolvedValue({ id: "m-1" })
    prismaMock.organization.findUnique.mockResolvedValue({
      ownerUserId: activeUser.id,
    })
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue(null)

    const result = await requireManageableProduct("org-product")

    expect(result.product.id).toBe("prod-org")
  })

  it("allows organization owner with qualifying subscription", async () => {
    authMock.mockResolvedValue({ userId: "clerk-owner" })
    getActiveUserByClerkIdMock.mockResolvedValue(activeUser)
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-org-sub",
      name: "Org Product",
      slug: "org-product-sub",
      userId: "someone-else",
      organizationId: "org-2",
    })
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null)
    prismaMock.organization.findUnique.mockResolvedValue({
      ownerUserId: activeUser.id,
    })
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue({
      id: "purchase-1",
    })

    const result = await requireManageableProduct("org-product-sub")

    expect(result.product.id).toBe("prod-org-sub")
  })

  it("throws notFound when product is missing", async () => {
    authMock.mockResolvedValue({ userId: "clerk-missing" })
    getActiveUserByClerkIdMock.mockResolvedValue(activeUser)
    prismaMock.product.findUnique.mockResolvedValue(null)

    await expect(requireManageableProduct("missing")).rejects.toThrow(
      "notFound",
    )
  })

  it("redirects when membership checks fail", async () => {
    authMock.mockResolvedValue({ userId: "clerk-error" })
    getActiveUserByClerkIdMock.mockResolvedValue(activeUser)
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-org-error",
      name: "Org Product",
      slug: "org-product-error",
      userId: "different",
      organizationId: "org-error",
    })
    prismaMock.organizationMembership.findFirst.mockRejectedValueOnce(
      new Error("membership failure"),
    )
    prismaMock.organization.findUnique.mockResolvedValue({
      ownerUserId: activeUser.id,
    })
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue(null)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(requireManageableProduct("org-product-error")).rejects.toThrow(
      `redirect:${memberProductsStatusPath("unauthorized")}`,
    )

    expect(errorSpy).toHaveBeenCalledWith(
      "[productAccess] membership check failed",
      expect.any(Error),
    )

    errorSpy.mockRestore()
  })

  it("redirects when subscription access check rejects", async () => {
    authMock.mockResolvedValue({ userId: "clerk-sub-error" })
    getActiveUserByClerkIdMock.mockResolvedValue(activeUser)
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-org-sub-error",
      name: "Org Product",
      slug: "org-product-sub-error",
      userId: "different",
      organizationId: "org-sub-error",
    })
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null)
    prismaMock.organization.findUnique.mockRejectedValueOnce(
      new Error("org failure"),
    )
    prismaMock.userPlanPurchase.findFirst.mockResolvedValue(null)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      requireManageableProduct("org-product-sub-error"),
    ).rejects.toThrow(`redirect:${memberProductsStatusPath("unauthorized")}`)

    expect(errorSpy).toHaveBeenCalledWith(
      "[productAccess] subscription access check failed",
      expect.any(Error),
    )

    errorSpy.mockRestore()
  })
})
