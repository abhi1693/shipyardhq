import { describe, expect, it } from "vitest"

import {
  detectLikelyNsfw,
  sanitizeText,
  type SubredditDetails,
} from "@/scripts/reddit-discovery"

describe("sanitizeText", () => {
  it("separates camel case words", () => {
    expect(sanitizeText("BuiltDifferentNSFW")).toBe("Built Different NSFW")
  })
})

describe("detectLikelyNsfw", () => {
  const baseDetails: SubredditDetails = {
    name: "TestSubreddit",
    title: "A Friendly Place",
    description: "",
    subscribers: 0,
    url: "/r/test",
    queries: [],
    rules: [],
    siteRules: [],
  }

  it("flags subreddits with NSFW in the name", () => {
    const reason = detectLikelyNsfw({
      ...baseDetails,
      name: "BuiltDifferentNSFW",
      title: "BuiltDifferentNSFW",
    })

    expect(reason).toMatch(/nsfw/i)
  })

  it("flags subreddits with adult keywords in the description", () => {
    const reason = detectLikelyNsfw({
      ...baseDetails,
      description: "A place for OnlyFans creators to share tips",
    })

    expect(reason).toMatch(/only fans/i)
  })

  it("returns null for safe communities", () => {
    const reason = detectLikelyNsfw({
      ...baseDetails,
      name: "HelpfulFounders",
      title: "Startup Builders",
      description: "Tactics for indie hackers and SaaS teams",
    })

    expect(reason).toBeNull()
  })
})
