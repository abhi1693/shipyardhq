import { describe, expect, it } from "vitest"

import { toAbsoluteUrlFromSite } from "@/lib/seo/base"

describe("toAbsoluteUrlFromSite", () => {
  it("returns undefined for empty input", () => {
    expect(toAbsoluteUrlFromSite("", "https://shipyard.example")).toBeUndefined()
  })

  it("keeps absolute URLs", () => {
    expect(
      toAbsoluteUrlFromSite("https://example.com/a", "https://shipyard.example"),
    ).toBe("https://example.com/a")
  })

  it("resolves relative paths against site URL", () => {
    expect(toAbsoluteUrlFromSite("/pricing", "https://shipyard.example")).toBe(
      "https://shipyard.example/pricing",
    )
  })

  it("handles invalid/odd URL values", () => {
    // Function does not validate already-absolute http(s) URLs.
    expect(
      toAbsoluteUrlFromSite("http://[invalid", "https://shipyard.example"),
    ).toBe("http://[invalid")

    // It should return undefined when the base site URL is invalid.
    expect(toAbsoluteUrlFromSite("/pricing", "not a url")).toBeUndefined()
  })
})
