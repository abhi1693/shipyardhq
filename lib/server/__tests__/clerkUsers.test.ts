import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const redisGetMock = vi.hoisted(() => vi.fn())
const redisSetMock = vi.hoisted(() => vi.fn())
const redisDelMock = vi.hoisted(() => vi.fn())
const getRedisClientMock = vi.hoisted(() => vi.fn())
const clerkClientMock = vi.hoisted(() => vi.fn())
const clerkUserFetchMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: getRedisClientMock,
}))

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
}))

import {
  getClerkUserByIdCached,
  invalidateClerkUserCache,
  CLERK_USER_CACHE_PREFIX,
} from "@/lib/server/clerkUsers"

const redisClientStub = {
  get: redisGetMock,
  set: redisSetMock,
  del: redisDelMock,
}

const originalTtl = process.env.CLERK_USER_CACHE_TTL_SECONDS

describe("getClerkUserByIdCached", () => {
  beforeEach(() => {
    process.env.CLERK_USER_CACHE_TTL_SECONDS = undefined

    redisGetMock.mockReset()
    redisSetMock.mockReset()
    redisDelMock.mockReset()
    getRedisClientMock.mockReset()
    clerkClientMock.mockReset()
    clerkUserFetchMock.mockReset()

    getRedisClientMock.mockResolvedValue(redisClientStub)
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: clerkUserFetchMock,
      },
    })
  })

  it("returns the cached user when present", async () => {
    const cachedUser = { id: "user_42", firstName: "Cache" }
    redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedUser))

    const result = await getClerkUserByIdCached("user_42")

    expect(result).toEqual(cachedUser)
    expect(clerkUserFetchMock).not.toHaveBeenCalled()
    expect(redisSetMock).not.toHaveBeenCalled()
  })

  it("fetches from Clerk and caches the result on a miss", async () => {
    process.env.CLERK_USER_CACHE_TTL_SECONDS = "180"
    redisGetMock.mockResolvedValueOnce(null)

    const remoteUser = { id: "user_99", firstName: "Remote" }
    clerkUserFetchMock.mockResolvedValueOnce(remoteUser)

    const result = await getClerkUserByIdCached("user_99")

    expect(result).toEqual(remoteUser)
    expect(clerkUserFetchMock).toHaveBeenCalledWith("user_99")
    expect(redisSetMock).toHaveBeenCalledWith(
      `${CLERK_USER_CACHE_PREFIX}user_99`,
      JSON.stringify(remoteUser),
      { EX: 180 },
    )
  })

  it("skips caching when Redis is unavailable", async () => {
    getRedisClientMock.mockResolvedValueOnce(null)
    const remoteUser = { id: "user_73" }
    clerkUserFetchMock.mockResolvedValueOnce(remoteUser)

    const result = await getClerkUserByIdCached("user_73")

    expect(result).toEqual(remoteUser)
    expect(redisGetMock).not.toHaveBeenCalled()
    expect(redisSetMock).not.toHaveBeenCalled()
  })
})

describe("invalidateClerkUserCache", () => {
  beforeEach(() => {
    redisDelMock.mockReset()
    getRedisClientMock.mockReset()
    getRedisClientMock.mockResolvedValue(redisClientStub)
  })

  it("deletes the cached entry when Redis is available", async () => {
    await invalidateClerkUserCache("user_5")

    expect(redisDelMock).toHaveBeenCalledWith(`${CLERK_USER_CACHE_PREFIX}user_5`)
  })

  it("no-ops when Redis is unavailable", async () => {
    getRedisClientMock.mockResolvedValueOnce(null)

    await invalidateClerkUserCache("user_5")

    expect(redisDelMock).not.toHaveBeenCalled()
  })
})

afterEach(() => {
  process.env.CLERK_USER_CACHE_TTL_SECONDS = originalTtl
  vi.clearAllMocks()
})
