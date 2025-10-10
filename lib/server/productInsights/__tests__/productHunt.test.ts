import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const redisGetMock = vi.fn()
const redisSetMock = vi.fn()
const getRedisClientMock = vi.fn()

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: getRedisClientMock,
}))

vi.mock("@/lib/server/productInsights/config", () => ({
  getProductHuntAppId: vi.fn(() => "APPID"),
  getProductHuntSearchKey: vi.fn(() => "SEARCH_KEY"),
  getProductHuntIndexName: vi.fn(() => "Post_production"),
}))

describe("discoverProductHuntLaunches", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-07-15T00:00:00.000Z"))
    vi.clearAllMocks()
    fetchMock.mockReset()
    redisGetMock.mockReset()
    redisSetMock.mockReset()
    redisSetMock.mockResolvedValue(undefined)
    getRedisClientMock.mockResolvedValue({
      get: redisGetMock,
      set: redisSetMock,
    })
    ;(globalThis as any).fetch = fetchMock
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("fetches launches and stores them in cache", async () => {
    const sampleHit = {
      objectID: "launch_1",
      name: "AcmeBoard",
      slug: "acmeboard",
      tagline: "A shared HQ for async teams",
      url: "/posts/acmeboard",
      vote_count: 512,
      comments_count: 42,
      featured_at: "2024-02-10T08:00:00.000Z",
      created_at: "2024-02-10T08:00:00.000Z",
      topics: [
        {
          id: 1,
          name: "Productivity",
          slug: "productivity",
          followers_count: 1200,
        },
      ],
      product_links: [{ store_name: "Website", url: "https://acmeboard.com" }],
      user: {
        id: 99,
        name: "Jane Doe",
        username: "janedoe",
        headline: "Co-founder",
        avatar_url: "https://example.com/avatar.jpg",
      },
    }

    const similarHit = {
      ...sampleHit,
      objectID: "launch_2",
      name: "ZenBoard",
      slug: "zenboard",
      vote_count: 320,
      comments_count: 28,
    }

    const responseSequence = [
      { hits: [sampleHit] },
      { hits: [similarHit] },
      { hits: [] },
      { hits: [] },
    ]

    let callIndex = 0
    fetchMock.mockImplementation(async () => {
      const payload = responseSequence[callIndex] ?? { hits: [] }
      callIndex += 1
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const { discoverProductHuntLaunches } = await import(
      "@/lib/server/productInsights/productHunt"
    )

    const result = await discoverProductHuntLaunches({
      productId: "prod_123",
      product: {
        name: "AcmeBoard",
      },
      competitors: [
        {
          name: "ZenBoard",
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(redisSetMock).toHaveBeenCalledTimes(1)

    expect(result.fromCache).toBe(false)
    expect(result.data.launches).toHaveLength(1)
    const [launch] = result.data.launches
    expect(launch.name).toBe("AcmeBoard")
    expect(launch.url).toBe("https://www.producthunt.com/posts/acmeboard")
    expect(launch.externalUrl).toBe("https://acmeboard.com")
    expect(result.data.summary?.totalVotes).toBeGreaterThanOrEqual(512)
    expect(result.data.summary?.totalComments).toBeGreaterThanOrEqual(42)
    expect(result.data.summary?.averageVotesPerDay).not.toBeNull()
    expect(result.data.similarLaunches?.length ?? 0).toBeGreaterThanOrEqual(1)
    const summaryInsights = result.data.summary?.insights ?? null
    if (summaryInsights) {
      expect(Array.isArray(summaryInsights)).toBe(true)
    }
  })

  it("filters out launches older than the max lookback window", async () => {
    const oldHit = {
      objectID: "launch_old",
      name: "LegacyBoard",
      slug: "legacyboard",
      tagline: "Legacy entry",
      url: "/posts/legacyboard",
      vote_count: 120,
      comments_count: 8,
      featured_at: "2023-09-01T08:00:00.000Z",
      created_at: "2023-09-01T08:00:00.000Z",
    }

    fetchMock.mockImplementation(async () => {
      return new Response(JSON.stringify({ hits: [oldHit] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const { discoverProductHuntLaunches } = await import(
      "@/lib/server/productInsights/productHunt"
    )

    const result = await discoverProductHuntLaunches({
      productId: "prod_old",
      product: {
        name: "LegacyBoard",
      },
    })

    expect(result.data.launches).toHaveLength(0)
    expect(result.data.similarLaunches).toBeNull()
    expect(result.data.summary).toBeNull()
  })

  it("returns cached payload when present", async () => {
    const cachedHit = {
      objectID: "launch_cached",
      name: "Cached",
      slug: "cached",
      tagline: "Cached entry",
      url: "/posts/cached",
      vote_count: 100,
      comments_count: 10,
      featured_at: "2024-06-01T00:00:00.000Z",
      created_at: "2024-06-01T00:00:00.000Z",
    }

    redisGetMock.mockResolvedValue(
      JSON.stringify({
        queries: ["Cached"],
        launches: [cachedHit],
        similarLaunches: [cachedHit],
        matchedLaunchId: "launch_cached",
        summary: {
          totalVotes: 100,
          totalComments: 10,
          featuredLaunchCount: 0,
        },
        fetchedAt: "2024-02-01T00:00:00.000Z",
      }),
    )

    const fetchNoop = vi.fn()
    ;(globalThis as any).fetch = fetchNoop

    const { discoverProductHuntLaunches } = await import(
      "@/lib/server/productInsights/productHunt"
    )

    const result = await discoverProductHuntLaunches({
      productId: "prod_cached",
      product: {
        name: "Cached",
      },
    })

    expect(fetchNoop).not.toHaveBeenCalled()
    expect(result.fromCache).toBe(true)
    expect(result.data.launches).toHaveLength(1)
    expect(result.data.similarLaunches?.length).toBe(1)
    expect(result.data.matchedLaunchId).toBe("launch_cached")
    expect(result.data.summary?.totalVotes).toBe(200)
  })
})
