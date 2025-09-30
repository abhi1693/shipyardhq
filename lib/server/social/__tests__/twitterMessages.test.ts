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

    const lines = tweet.split("\n")
    expect(lines[0]).toContain("Mariner AI")
    expect(lines[1]).toContain("@mariner — Collaborative documentation for builders.")
    expect(lines[2]).toBe(SAMPLE_URL)
    expect(lines[3]).toContain("#ShipyardHQ")
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
    const lines = tweet.split("\n")
    expect(lines[1]).toContain("@voyagerCrew")
    expect(lines.at(-1)).toBe("#ShipyardHQ #ProductLaunch #IndieSaaS")
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
    expect(trendingTweet?.split("\n").at(-1)).toContain("#Trending")
    expect(featuredTweet?.split("\n").at(-1)).toContain("#Featured")
    expect(trendingTweet).toContain("@dockSync")
    expect(editorsPickTweet?.split("\n").at(-1)).toContain("#EditorsPick")
    expect(editorsPickTweet).toContain("@dockSync")
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

    const lines = tweet.split("\n")
    expect(lines[0]).toContain("Atlas (@atlas) leads the May 2024 leaderboard")
    expect(lines[1]).toBe("Top builders:")
    expect(lines[2]).toBe("1. Atlas (@atlas)")
    expect(lines[3]).toBe("2. Compass (@compass)")
    expect(lines[4]).toBe("3. Beacon")
    expect(lines[5]).toBe("https://shipyard.example/leaderboard")
    expect(lines[6]).toContain("#Leaderboard")
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
    expect(extractTwitterHandle("https://twitter.com/makers"))
      .toBe("@makers")
    expect(extractTwitterHandle("https://x.com/makers/status/123"))
      .toBe("@makers")
    expect(extractTwitterHandle(""))
      .toBeNull()
    expect(extractTwitterHandle("invalid handle"))
      .toBeNull()
  })
})
