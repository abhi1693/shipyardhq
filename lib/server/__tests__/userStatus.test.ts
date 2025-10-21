import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}))

const redisClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

const getRedisClientMock = vi.hoisted(() => vi.fn())

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

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: getRedisClientMock,
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

import {
  INACTIVE_ACCOUNT_MESSAGE,
  SUSPENDED_ACCOUNT_PATH,
  getActiveUserByClerkId,
  invalidateActiveUserCache,
  requireActiveUserOrRedirect,
} from "@/lib/server/userStatus"

const originalEnv = process.env.NODE_ENV

describe("userStatus", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset()
    getRedisClientMock.mockReset()
    redisClientMock.get.mockReset()
    redisClientMock.set.mockReset()
    redisClientMock.del.mockReset()
    redisClientMock.get.mockResolvedValue(null)
    redisClientMock.set.mockResolvedValue("OK")
    redisClientMock.del.mockResolvedValue(1)
    getRedisClientMock.mockResolvedValue(null)
    ensureDailyLoginRewardMock.mockClear()
    redirectMock.mockClear()
    process.env.NODE_ENV = originalEnv
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

  it("does not cache inactive results for newly created users", async () => {
    process.env.NODE_ENV = "development"
    getRedisClientMock.mockResolvedValue(redisClientMock as any)

    const activeUser = {
      id: "user-5",
      email: "fresh@example.com",
      role: "member",
      status: "active",
      firstName: "Fresh",
      lastName: "User",
      onboardedAt: null,
    }

    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeUser)

    const firstResult = await getActiveUserByClerkId("clerk-new")
    expect(firstResult).toBeNull()
    expect(redisClientMock.set).not.toHaveBeenCalled()
    expect(redisClientMock.del).toHaveBeenCalledTimes(1)

    redisClientMock.get.mockResolvedValueOnce(null)

    const secondResult = await getActiveUserByClerkId("clerk-new")
    expect(secondResult).toEqual(activeUser)
    expect(redisClientMock.set).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(activeUser),
      expect.objectContaining({ EX: expect.any(Number) }),
    )
  })

  it("invalidates cached active users when redis client is available", async () => {
    getRedisClientMock.mockResolvedValue(redisClientMock as any)

    await invalidateActiveUserCache("clerk-valid")

    expect(redisClientMock.del).toHaveBeenCalledWith(expect.any(String))
  })

  it("skips cache invalidation when redis client is unavailable", async () => {
    getRedisClientMock.mockResolvedValue(null)

    await invalidateActiveUserCache("clerk-missing")

    expect(redisClientMock.del).not.toHaveBeenCalled()
  })
})

describe("constants", () => {
  it("exposes suspended account copy", () => {
    expect(SUSPENDED_ACCOUNT_PATH).toBe("/auth/suspended")
    expect(INACTIVE_ACCOUNT_MESSAGE).toBe("Account is not active")
  })
})
