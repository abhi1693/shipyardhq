import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const entries = new Map<string, { value: string; expiresAt?: number }>()
  const get = vi.fn(async (key: string) => {
    const entry = entries.get(key)
    if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      entries.delete(key)
      return null
    }
    return entry?.value ?? null
  })
  const set = vi.fn(
    async (key: string, value: string, options?: { EX: number }) => {
      entries.set(key, {
        value,
        expiresAt: options ? Date.now() + options.EX * 1000 : undefined,
      })
    },
  )
  return {
    entries,
    client: { get, set, isOpen: true },
    findRun: vi.fn(),
    findScores: vi.fn(),
    findArchiveRuns: vi.fn(),
    findUpvotes: vi.fn(),
  }
})

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: async () => mocks.client,
}))
vi.mock("@/lib/prisma", () => ({
  default: {
    leaderboardRun: {
      findUnique: mocks.findRun,
      findMany: mocks.findArchiveRuns,
    },
    productLeaderboardScore: { findMany: mocks.findScores },
    productUpvote: { findMany: mocks.findUpvotes },
  },
}))
vi.mock("@/lib/cache", () => ({
  applyCache: vi.fn(),
  DEFAULT_TTL: { fast: 60, slow: 3600 },
  TAGS: { leaderboard: "leaderboard" },
}))
vi.mock("@/lib/server/leaderboard/v2", () => ({}))
vi.mock("@/lib/server/analytics/cloudflareAnalytics", () => ({
  CLOUDFLARE_ANALYTICS_MIN_START_DATE: "2026-01-01",
}))
vi.mock("@/lib/server/analytics/store", () => ({}))

import {
  getPeriodicLeaderboard,
  invalidateHistoricalPeriodicLeaderboardCache,
} from "@/actions/public/leaderboard/actions"

const day = 24 * 60 * 60 * 1000
const startedAt = Date.parse("2026-09-13T12:00:00Z")
const window = {
  period: "day" as const,
  periodStart: new Date("2026-09-12T00:00:00Z"),
  periodEnd: new Date("2026-09-13T00:00:00Z"),
  limit: 100,
}

describe("historical leaderboard cache retention", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(startedAt)
    mocks.entries.clear()
    mocks.findRun.mockResolvedValue({ id: "run-1" })
    mocks.findScores.mockResolvedValue([])
    mocks.findArchiveRuns.mockResolvedValue([])
    mocks.findUpvotes.mockResolvedValue([])
  })

  afterEach(() => vi.useRealTimers())

  it("reuses cached results but reloads after 24 hours without sliding expiry", async () => {
    const first = await getPeriodicLeaderboard(window)
    expect(mocks.findRun).toHaveBeenCalledTimes(1)

    vi.setSystemTime(startedAt + day - 1)
    expect(await getPeriodicLeaderboard(window)).toEqual(first)
    expect(mocks.findRun).toHaveBeenCalledTimes(1)

    vi.setSystemTime(startedAt + day + 1)
    expect(await getPeriodicLeaderboard(window)).toEqual(first)
    expect(mocks.findRun).toHaveBeenCalledTimes(2)
  })

  it("expires invalidated generations while keeping the version marker persistent", async () => {
    await getPeriodicLeaderboard(window)
    const oldKey = [...mocks.entries.keys()][0]

    vi.setSystemTime(startedAt + 60_000)
    const { version } = await invalidateHistoricalPeriodicLeaderboardCache()
    await getPeriodicLeaderboard(window)
    expect(mocks.findRun).toHaveBeenCalledTimes(2)
    const versionKey = [...mocks.entries.keys()].find((key) =>
      key.endsWith(":historical:version"),
    )!
    const newKey = [...mocks.entries.keys()].find((key) =>
      key.includes(`:historical:v2:${version}:`),
    )!

    vi.setSystemTime(startedAt + day + 1)
    expect(await mocks.client.get(oldKey)).toBeNull()
    expect(await mocks.client.get(newKey)).not.toBeNull()

    vi.setSystemTime(startedAt + day + 60_001)
    expect(await mocks.client.get(newKey)).toBeNull()
    expect(await mocks.client.get(versionKey)).toBe(version)
  })
})
