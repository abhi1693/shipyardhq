import { beforeEach, describe, expect, it, vi } from "vitest"

const redisGetMock = vi.fn()
const redisSetMock = vi.fn()
const openaiResponsesCreateMock = vi.fn()

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    get: redisGetMock,
    set: redisSetMock,
  }),
}))

vi.mock("@/lib/server/openai", () => ({
  getOpenAIClient: vi.fn(() => ({
    responses: {
      create: openaiResponsesCreateMock,
    },
  })),
}))

const sampleHits = [
  {
    objectID: "story_1",
    title: "AcmeAI launch hits the front page",
    url: "https://example.com/acmeai",
    author: "founder1",
    points: 128,
    num_comments: 42,
    created_at_i: 1_700_000_000,
    story_text: "AcmeAI is redefining automation workflows.",
    _highlightResult: {
      story_text: {
        value: "AcmeAI <em>automation</em> workflows",
      },
    },
  },
]

describe("discoverProductHackerNewsMentions", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ hits: sampleHits }),
      text: async () => "",
    }))
    ;(globalThis as any).fetch = fetchMock
    redisGetMock.mockReset()
    redisSetMock.mockReset()
    openaiResponsesCreateMock.mockReset()
    openaiResponsesCreateMock.mockResolvedValue({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                summary: "Users praise the automation and want faster onboarding.",
                highlights: [
                  "Automation workflows land well with operations teams",
                  "Pricing questions surface around annual plans",
                ],
                topStories: [
                  {
                    title: sampleHits[0]!.title,
                    discussionUrl: `https://news.ycombinator.com/item?id=${sampleHits[0]!.objectID}`,
                    keyTakeaway: "Thread focuses on launch impressions and comparisons with BetterAI",
                  },
                ],
              }),
            },
          ],
        },
      ],
    })
  })

  it("aggregates stories across generated queries", async () => {
    const { discoverProductHackerNewsMentions } = await import(
      "@/lib/server/productInsights/hackerNews"
    )

    redisGetMock.mockResolvedValue(null)

    const result = await discoverProductHackerNewsMentions({
      productId: "prod_1",
      product: {
        name: "AcmeAI",
        tagline: "Automation copilot",
        description: "Streamline operations with AI",
        pricingModel: "subscription",
        type: "saas",
        keywords: ["automation", "workflow"],
        platforms: ["web"],
      },
      summary: {
        overview: "AcmeAI automates busywork",
        valuePropositions: ["Reduce manual workflows"],
        targetUsers: ["Operations teams"],
        keyFeatures: ["Automation rules", "AI assistant"],
        painPointsAddressed: ["Manual task routing"],
        toneAndStyle: ["Pragmatic"],
      },
      competitors: [{ name: "BetterAI" }],
      forceRefresh: true,
    })

    expect(result.queries.length).toBeGreaterThan(0)
    expect(
      result.queries.some((entry) => entry.query.includes('BetterAI')),
    ).toBe(true)
    expect(
      result.queries.some((entry) => entry.query.toLowerCase().includes('automation')),
    ).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(result.queries.length)
    expect(result.stories).toHaveLength(1)
    const [story] = result.stories
    expect(story.title).toContain("AcmeAI")
    expect(story.matchedQueries?.length).toBe(result.queries.length)
    expect(result.model).toBe("hn.algolia/v1")
    expect(redisSetMock).toHaveBeenCalledTimes(1)
    expect(openaiResponsesCreateMock).toHaveBeenCalled()
    expect(result.summary?.highlights.length).toBeGreaterThan(0)
  })

  it("returns cached payload when available", async () => {
    const { discoverProductHackerNewsMentions } = await import(
      "@/lib/server/productInsights/hackerNews"
    )

    const cachedPayload = {
      queries: [{ query: "AcmeAI", rationale: null }],
      stories: sampleHits.map((hit) => ({
        id: hit.objectID,
        title: hit.title,
        url: hit.url,
        discussionUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author,
        points: hit.points,
        numComments: hit.num_comments,
        createdAt: new Date(hit.created_at_i * 1000).toISOString(),
        snippet: hit.story_text,
        matchedQueries: ["AcmeAI"],
      })),
      summary: {
        summary: "Cached summary",
        highlights: ["Cached highlight"],
        topStories: [
          {
            title: sampleHits[0]!.title,
            discussionUrl: `https://news.ycombinator.com/item?id=${sampleHits[0]!.objectID}`,
            keyTakeaway: "Cached takeaway",
          },
        ],
      },
      model: "hn.algolia/v1",
      cachedAt: new Date().toISOString(),
    }

    redisGetMock.mockResolvedValue(JSON.stringify(cachedPayload))

    const result = await discoverProductHackerNewsMentions({
      productId: "prod_cached",
      product: {
        name: "AcmeAI",
      },
    })

    expect(result.fromCache).toBe(true)
    expect(result.stories).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(redisSetMock).not.toHaveBeenCalled()
    expect(result.summary?.summary).toBe("Cached summary")
  })
})
