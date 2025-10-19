import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

const ensureDailyLoginRewardMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
)

vi.mock("@/lib/server/rewards/loginReward", () => ({
  ensureDailyLoginReward: ensureDailyLoginRewardMock,
}))

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
)

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

import {
  INACTIVE_ACCOUNT_MESSAGE,
  SUSPENDED_ACCOUNT_PATH,
  getActiveUserByClerkId,
  requireActiveUserOrRedirect,
} from "@/lib/server/userStatus"

describe("userStatus", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset()
    redirectMock.mockClear()
  })

  it("returns null when clerkId is missing", async () => {
    const result = await getActiveUserByClerkId("")
    expect(result).toBeNull()
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it("returns active user details", async () => {
    const activeUser = {
      id: "user-1",
      email: "user@example.com",
      role: "member",
      status: "active",
      firstName: "Ada",
      lastName: "Lovelace",
    }
    prismaMock.user.findUnique.mockResolvedValue(activeUser)

    const result = await getActiveUserByClerkId("clerk-1")
    expect(result).toEqual(activeUser)
  })

  it("filters out inactive users", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ status: "suspended" })

    const result = await getActiveUserByClerkId("clerk-2")
    expect(result).toBeNull()
  })

  it("redirects when clerkId is missing", async () => {
    await expect(requireActiveUserOrRedirect(undefined)).rejects.toThrow(
      `redirect:${SUSPENDED_ACCOUNT_PATH}`,
    )
  })

  it("redirects when user is not active", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ status: "pending" })

    await expect(requireActiveUserOrRedirect("clerk-3")).rejects.toThrow(
      `redirect:${SUSPENDED_ACCOUNT_PATH}`,
    )
    expect(redirectMock).toHaveBeenCalledWith(SUSPENDED_ACCOUNT_PATH)
  })

  it("returns user when active and avoids redirect", async () => {
    const activeUser = {
      id: "user-4",
      email: "active@example.com",
      role: "member",
      status: "active",
      firstName: "Grace",
      lastName: "Hopper",
    }
    prismaMock.user.findUnique.mockResolvedValue(activeUser)

    const result = await requireActiveUserOrRedirect("clerk-4")

    expect(result).toEqual(activeUser)
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe("constants", () => {
  it("exposes suspended account copy", () => {
    expect(SUSPENDED_ACCOUNT_PATH).toBe("/auth/suspended")
    expect(INACTIVE_ACCOUNT_MESSAGE).toBe("Account is not active")
  })
})
