import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const CACHE_PREFIX = "tests"
const originalCachePrefix = process.env.CACHE_ENV_PREFIX
process.env.CACHE_ENV_PREFIX = CACHE_PREFIX

type RedisHash = Map<string, string>

type RedisData = {
  hashes: Map<string, RedisHash>
  strings: Map<string, number>
  sets: Map<string, Set<string>>
}

function createRedisData(): RedisData {
  return {
    hashes: new Map(),
    strings: new Map(),
    sets: new Map(),
  }
}

function ensureHash(store: RedisData, key: string): RedisHash {
  let hash = store.hashes.get(key)
  if (!hash) {
    hash = new Map()
    store.hashes.set(key, hash)
  }
  return hash
}

function ensureSet(store: RedisData, key: string): Set<string> {
  let set = store.sets.get(key)
  if (!set) {
    set = new Set()
    store.sets.set(key, set)
  }
  return set
}

function createRedisClient(store: RedisData) {
  return {
    isOpen: true,
    async hGet(key: string, field: string) {
      return ensureHash(store, key).get(field) ?? null
    },
    async hSet(key: string, field: string, value: string) {
      ensureHash(store, key).set(field, value)
      return 1
    },
    async hDel(key: string, field: string) {
      return ensureHash(store, key).delete(field) ? 1 : 0
    },
    async hLen(key: string) {
      return ensureHash(store, key).size
    },
    async hGetAll(key: string) {
      const entries = Object.fromEntries(ensureHash(store, key).entries())
      return entries
    },
    async sAdd(key: string, value: string) {
      ensureSet(store, key).add(value)
      return 1
    },
    async sRem(key: string, value: string) {
      ensureSet(store, key).delete(value)
      return 1
    },
    async sMembers(key: string) {
      return Array.from(ensureSet(store, key).values())
    },
    async get(key: string) {
      const value = store.strings.get(key)
      return typeof value === "number" ? String(value) : null
    },
    async incrBy(key: string, increment: number) {
      const current = store.strings.get(key) ?? 0
      const next = current + increment
      store.strings.set(key, next)
      return next
    },
    async del(key: string) {
      store.hashes.delete(key)
      store.strings.delete(key)
      store.sets.delete(key)
      return 1
    },
    multi() {
      const commands: Array<() => Promise<any>> = []
      const multiApi = {
        hSet: (key: string, field: string, value: string) => {
          commands.push(() => this.hSet(key, field, value))
          return multiApi
        },
        hDel: (key: string, field: string) => {
          commands.push(() => this.hDel(key, field))
          return multiApi
        },
        incrBy: (key: string, value: number) => {
          commands.push(() => this.incrBy(key, value))
          return multiApi
        },
        sAdd: (key: string, value: string) => {
          commands.push(() => this.sAdd(key, value))
          return multiApi
        },
        exec: async () => {
          const results: any[] = []
          for (const command of commands) {
            results.push(await command())
          }
          return results
        },
      }
      return multiApi
    },
  }
}

const getRedisClientMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: getRedisClientMock,
}))

const prismaMock = vi.hoisted(() => ({
  productUpvote: {
    findUnique: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  productAnalytics: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import {
  getLiveUpvoteCount,
  resolveVoteState,
  setDesiredVoteState,
  getPendingVoteDelta,
} from "@/lib/server/productVotesStore"
import { buildCacheKey, namespaceCacheKey } from "@/lib/server/cache"

let redisStore: RedisData
let redisClient: ReturnType<typeof createRedisClient>

describe("productVotesStore", () => {
  beforeEach(() => {
    redisStore = createRedisData()
    redisClient = createRedisClient(redisStore)

    Object.values(prismaMock.productUpvote).forEach((value) =>
      value.mockReset(),
    )
    Object.values(prismaMock.productAnalytics).forEach((value) =>
      value.mockReset(),
    )
    prismaMock.$queryRaw.mockReset()
    prismaMock.$transaction.mockReset()

    getRedisClientMock.mockReset()
    getRedisClientMock.mockResolvedValue(redisClient)
  })

  it("queues a pending upvote when redis is available", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce(null)

    const result = await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
      client: redisClient,
    })

    const expectedHashKey = namespaceCacheKey(
      buildCacheKey("product", "prod-1", "votes", "pending"),
    )
    const expectedDeltaKey = namespaceCacheKey(
      buildCacheKey("product", "prod-1", "votes", "delta"),
    )

    expect(result.state).toBe("upvoted")
    expect(await redisClient.hGet(expectedHashKey, "user-1")).toBeTruthy()
    expect(await redisClient.get(expectedDeltaKey)).toBe("1")
  })

  it("supports multiple users upvoting the same product", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValue(null)

    await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
      client: redisClient,
    })

    await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-2",
      desiredState: "upvoted",
      client: redisClient,
    })

    const delta = await getPendingVoteDelta("prod-1", redisClient)
    expect(delta).toBe(2)

    const stateUser1 = await resolveVoteState("prod-1", "user-1", redisClient)
    const stateUser2 = await resolveVoteState("prod-1", "user-2", redisClient)

    expect(stateUser1.currentState).toBe("upvoted")
    expect(stateUser2.currentState).toBe("upvoted")
  })

  it("removes pending data when toggling back to not upvoted", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValue(null)

    await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
      client: redisClient,
    })

    const result = await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "not_upvoted",
      client: redisClient,
    })

    const expectedHashKey = namespaceCacheKey(
      buildCacheKey("product", "prod-1", "votes", "pending"),
    )

    expect(result.state).toBe("not_upvoted")
    expect(await redisClient.hLen(expectedHashKey)).toBe(0)
  })

  it("falls back to database updates when redis is unavailable", async () => {
    getRedisClientMock.mockResolvedValueOnce(null)

    const txMocks = {
      productUpvote: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockResolvedValue({ id: "new", createdAt: new Date("2023-01-01T00:00:00Z") }),
        delete: vi.fn(),
      },
      productAnalytics: {
        upsert: vi.fn(),
        update: vi.fn(),
      },
      $executeRaw: vi.fn(),
    }

    prismaMock.$transaction.mockImplementation(async (handler) =>
      handler(txMocks),
    )
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce(null)

    const result = await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
    })

    expect(result.state).toBe("upvoted")
    expect(prismaMock.$transaction).toHaveBeenCalled()
    expect(txMocks.productUpvote.create).toHaveBeenCalledWith({
      data: { productId: "prod-1", userId: "user-1" },
      select: { id: true, createdAt: true },
    })
  })

  it("returns live counts including pending delta", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValue(null)
    prismaMock.$queryRaw.mockResolvedValue([{ upvotes: 4 }])

    await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
      client: redisClient,
    })

    const total = await getLiveUpvoteCount("prod-1", redisClient)

    expect(total).toBe(5)
  })
})

afterAll(() => {
  process.env.CACHE_ENV_PREFIX = originalCachePrefix
})
