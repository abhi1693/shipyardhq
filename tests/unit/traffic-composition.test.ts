import { describe, expect, it } from "vitest"

import { classifyTrafficComposition } from "@/lib/server/analytics/trafficComposition"

describe("traffic composition classification", () => {
  it("prioritizes a verified automation category over the browser signature", () => {
    expect(
      classifyTrafficComposition({
        verifiedBotCategory: "AI Crawler",
        userAgentBrowser: "Chrome",
        requestSource: "eyeball",
      }),
    ).toEqual({
      segment: "verified_automated",
      category: "AI Crawler",
    })
  })

  it("classifies standard browsers from regular visitor requests", () => {
    expect(
      classifyTrafficComposition({
        userAgentBrowser: "ChromeMobile",
        requestSource: "eyeball",
      }),
    ).toEqual({ segment: "browser", category: "Browser traffic" })
  })

  it("keeps platform-generated traffic in the unclassified total", () => {
    expect(
      classifyTrafficComposition({
        userAgentBrowser: "Unknown",
        requestSource: "earlyHintsCache",
      }),
    ).toEqual({ segment: "other", category: "Platform generated" })
  })

  it("does not present an unverified bot signature as regular browser traffic", () => {
    expect(
      classifyTrafficComposition({
        userAgentBrowser: "GoogleBot",
        requestSource: "eyeball",
      }),
    ).toEqual({ segment: "other", category: "Unverified automation" })
  })
})
