import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const redisMultiMock = vi.fn()
const redisGetMock = vi.fn()
const redisMGetMock = vi.fn()

const redisClient = {
  multi: (...args: unknown[]) => redisMultiMock(...args),
  get: (...args: unknown[]) => redisGetMock(...args),
  mGet: (...args: unknown[]) => redisMGetMock(...args),
}

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: vi.fn(async () => redisClient),
}))

let currentMulti: {
  incr: ReturnType<typeof vi.fn>
  exec: ReturnType<typeof vi.fn>
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

describe("trend radar telemetry", () => {
  beforeEach(() => {
    redisMultiMock.mockReset()
    redisGetMock.mockReset()
    redisMGetMock.mockReset()
    currentMulti = {
      incr: vi.fn(),
      exec: vi.fn(),
    }
    currentMulti.incr.mockReturnValue(currentMulti)
    currentMulti.exec.mockResolvedValue(undefined)
    redisMultiMock.mockImplementation(() => currentMulti)
  })

  afterEach(() => {
    vi.resetModules()
    vi.useRealTimers()
  })

  it("namespaces embed counter keys when recording views", async () => {
    const { buildCacheKey } = await import(
      "@/lib/server/cache"
    )
    const { recordTrendRadarEmbedView } = await import(
      "@/lib/server/trendRadar/telemetry"
    )

    const date = new Date("2024-05-01T12:00:00Z")
    const expectedTotalKey = buildCacheKey("trend-radar", "embed", "total")
    const expectedDailyKey = buildCacheKey(
      "trend-radar",
      "embed",
      "daily",
      formatDateKey(date),
    )

    await recordTrendRadarEmbedView(date)

    expect(redisMultiMock).toHaveBeenCalledTimes(1)
    expect(currentMulti.incr).toHaveBeenNthCalledWith(1, expectedTotalKey)
    expect(currentMulti.incr).toHaveBeenNthCalledWith(2, expectedDailyKey)
    expect(currentMulti.exec).toHaveBeenCalledTimes(1)
  })

  it("namespaces keys when reading embed stats", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-05-10T00:00:00Z"))

    const { buildCacheKey } = await import(
      "@/lib/server/cache"
    )
    const { getTrendRadarEmbedStats } = await import(
      "@/lib/server/trendRadar/telemetry"
    )

    const expectedTotalKey = buildCacheKey("trend-radar", "embed", "total")

    const days = 3
    const reference = new Date()
    reference.setHours(0, 0, 0, 0)
    const expectedDailyKeys: string[] = []

    for (let offset = days - 1; offset >= 0; offset--) {
      const target = new Date(reference)
      target.setDate(reference.getDate() - offset)
      expectedDailyKeys.push(
        buildCacheKey(
          "trend-radar",
          "embed",
          "daily",
          formatDateKey(target),
        ),
      )
    }

    redisGetMock.mockResolvedValue("5")
    redisMGetMock.mockResolvedValue(expectedDailyKeys.map(() => "1"))

    const result = await getTrendRadarEmbedStats(days)

    expect(result.available).toBe(true)
    expect(redisGetMock).toHaveBeenCalledWith(expectedTotalKey)
    expect(redisMGetMock).toHaveBeenCalledWith(expectedDailyKeys)
  })
})
