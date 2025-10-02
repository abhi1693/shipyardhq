import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildBadgeTweet,
  buildLeaderboardTweet,
  buildProductLaunchTweet,
  composeTweet,
  extractTwitterHandle,
} from "@/lib/server/social/twitterMessages"

const responsesCreateMock = vi.fn()

vi.mock("@/lib/server/openai", () => ({
  getOpenAIClient: () => ({
    responses: {
      create: responsesCreateMock,
    },
  }),
}))

const SAMPLE_URL = "https://shipyard.example/products/test"

afterEach(() => {
  responsesCreateMock.mockReset()
  delete (process.env as Record<string, string | undefined>).OPENAI_API_KEY
})

describe("twitter message builders", () => {
  it("builds a launch tweet with hashtags and url", async () => {
    const tweet = await buildProductLaunchTweet({
      name: "Mariner AI",
      tagline: "Collaborative documentation for builders.",
      url: SAMPLE_URL,
      twitterHandle: "@mariner",
    })

    const segments = tweet.split("\n\n")
    expect(segments[0]).toBe(
      "Mariner AI (@mariner) just launched on Shipyard HQ!",
    )
    expect(segments[1]).toBe("Collaborative documentation for builders.")
    expect(segments[2]).toBe(SAMPLE_URL)
    expect(segments[3]).toBe("#ShipyardHQ #ProductLaunch #IndieSaaS")
    expect(tweet.length).toBeLessThanOrEqual(280)
  })

  it("truncates long body content to stay within character limits", async () => {
    const longTagline = "A".repeat(400)
    const tweet = await buildProductLaunchTweet({
      name: "Voyager",
      tagline: longTagline,
      url: SAMPLE_URL,
      twitterHandle: "voyagerCrew",
    })

    expect(tweet.length).toBeLessThanOrEqual(280)
    expect(tweet).toContain("Voyager")
    expect(tweet.includes("...")).toBe(true)
    const segments = tweet.split("\n\n")
    expect(segments[0]).toContain("@voyagerCrew")
    expect(segments.at(-1)).toMatch(/^#ShipyardHQ #ProductLaunch/)
  })

  it("builds badge tweets for trending and featured badges", async () => {
    const trendingTweet = await buildBadgeTweet({
      badge: "trending",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
      twitterHandle: "dockSync",
    })
    const featuredTweet = await buildBadgeTweet({
      badge: "featured",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
      twitterHandle: "@dockSync",
    })
    const editorsPickTweet = await buildBadgeTweet({
      badge: "editor-pick",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
      twitterHandle: "dockSync",
    })

    expect(trendingTweet).toBeTruthy()
    expect(featuredTweet).toBeTruthy()
    expect(editorsPickTweet).toBeTruthy()
    expect(trendingTweet?.split("\n\n").at(-1)).toContain("#Trending")
    expect(featuredTweet?.split("\n\n").at(-1)).toContain("#Featured")
    expect(trendingTweet).toContain("DockSync (@dockSync) is trending")
    expect(editorsPickTweet?.split("\n\n").at(-1)).toContain("#EditorsPick")
    expect(editorsPickTweet).toContain("Editor's pick: DockSync (@dockSync)!")
  })

  it("returns null for unsupported badge types", async () => {
    const tweet = await buildBadgeTweet({
      badge: "unknown",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
    })

    expect(tweet).toBeNull()
  })

  it("summarizes leaderboard winners", async () => {
    const tweet = await buildLeaderboardTweet({
      monthLabel: "May 2024",
      leaderboardUrl: "https://shipyard.example/leaderboard",
      winners: [
        { rank: 1, name: "Atlas", twitterHandle: "@atlas" },
        { rank: 2, name: "Compass", twitterHandle: "compass" },
        { rank: 3, name: "Beacon" },
      ],
    })

    const segments = tweet.split("\n\n")
    expect(segments[0]).toContain(
      "Atlas (@atlas) leads the May 2024 leaderboard",
    )
    const bodyLines = segments[1].split("\n")
    expect(bodyLines[0]).toBe("Top builders:")
    expect(bodyLines[1]).toBe("1. Atlas (@atlas)")
    expect(bodyLines[2]).toBe("2. Compass (@compass)")
    expect(bodyLines[3]).toBe("3. Beacon")
    expect(segments[2]).toBe("https://shipyard.example/leaderboard")
    expect(segments[3]).toContain("#Leaderboard")
    expect(tweet.length).toBeLessThanOrEqual(280)
  })

  it("deduplicates hashtags and strips invalid characters", () => {
    const tweet = composeTweet({
      headline: "Testing tweet",
      body: "Body copy",
      url: SAMPLE_URL,
      hashtags: ["#ShipyardHQ", "ShipyardHQ", "Maker!Zone", "Makers"],
    })

    const hashtagSection = tweet.split(SAMPLE_URL).pop() ?? ""
    expect(hashtagSection).toContain("#ShipyardHQ")
    expect(hashtagSection).toContain("#Makers")
    expect(hashtagSection).not.toContain("Maker!Zone")
  })

  it("extracts twitter handles from various inputs", () => {
    expect(extractTwitterHandle("@makers")).toBe("@makers")
    expect(extractTwitterHandle("makers")).toBe("@makers")
    expect(extractTwitterHandle("https://twitter.com/makers")).toBe("@makers")
    expect(extractTwitterHandle("https://x.com/makers/status/123")).toBe(
      "@makers",
    )
    expect(extractTwitterHandle("")).toBeNull()
    expect(extractTwitterHandle("invalid handle")).toBeNull()
  })

  it("leans on AI copy but still mentions the handle", async () => {
    process.env.OPENAI_API_KEY = "test-api-key"
    responsesCreateMock.mockResolvedValue({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: '{"headline":"Thrilled to see Mariner AI launch on Shipyard HQ today","body":"Collaborative docs for builders are rolling out now."}',
            },
          ],
        },
      ],
    })

    const tweet = await buildProductLaunchTweet({
      name: "Mariner AI",
      tagline: "Collaborative documentation for builders.",
      description: "All-in-one documentation tooling for indie teams.",
      url: SAMPLE_URL,
      twitterHandle: "@mariner",
    })

    expect(responsesCreateMock).toHaveBeenCalled()
    const request = responsesCreateMock.mock.calls[0]?.[0]
    expect(request).toBeTruthy()
    const userPayloadRaw = request.input?.[1]?.content
    expect(typeof userPayloadRaw).toBe("string")
    const parsedPayload = JSON.parse(userPayloadRaw)
    expect(parsedPayload.product.description).toBe(
      "All-in-one documentation tooling for indie teams.",
    )
    const segments = tweet.split("\n\n")
    expect(segments[0]).toContain("@mariner")
    expect(segments[0]).toContain("Mariner AI")
    expect(segments[1]).toBe(
      "Collaborative docs for builders are rolling out now.",
    )
    expect(segments.at(-1)).toBe("#ShipyardHQ #ProductLaunch #IndieSaaS")
    expect(tweet.length).toBeLessThanOrEqual(280)
  })
})
