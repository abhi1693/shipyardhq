import { describe, expect, it } from "vitest"

import {
  buildBadgeTweet,
  buildLeaderboardTweet,
  buildProductLaunchTweet,
  composeTweet,
  extractTwitterHandle,
} from "@/lib/server/social/twitterMessages"

const SAMPLE_URL = "https://shipyard.example/products/test"

describe("twitter message builders", () => {
  it("builds a launch tweet with hashtags and url", () => {
    const tweet = buildProductLaunchTweet({
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

  it("truncates long body content to stay within character limits", () => {
    const longTagline = "A".repeat(400)
    const tweet = buildProductLaunchTweet({
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

  it("builds badge tweets for trending and featured badges", () => {
    const trendingTweet = buildBadgeTweet({
      badge: "trending",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
      twitterHandle: "dockSync",
    })
    const featuredTweet = buildBadgeTweet({
      badge: "featured",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
      twitterHandle: "@dockSync",
    })
    const editorsPickTweet = buildBadgeTweet({
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

  it("returns null for unsupported badge types", () => {
    const tweet = buildBadgeTweet({
      badge: "unknown",
      name: "DockSync",
      tagline: "Automated changelog summaries.",
      url: SAMPLE_URL,
    })

    expect(tweet).toBeNull()
  })

  it("summarizes leaderboard winners", () => {
    const tweet = buildLeaderboardTweet({
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
})
