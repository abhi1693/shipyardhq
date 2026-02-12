import { describe, expect, it } from "vitest"

import { ensureUrlHasSchema, slugify } from "@/lib/utils"

describe("lib/utils", () => {
  it("slugify lowercases and removes punctuation", () => {
    expect(slugify("Hello, World!"))?.toBe("hello-world")
  })

  it("ensureUrlHasSchema returns empty/whitespace as-is", () => {
    expect(ensureUrlHasSchema("   ")).toBe("")
  })

  it("ensureUrlHasSchema keeps http(s) URLs intact", () => {
    expect(ensureUrlHasSchema("https://example.com")).toBe(
      "https://example.com",
    )
    expect(ensureUrlHasSchema("http://example.com")).toBe("http://example.com")
  })

  it("ensureUrlHasSchema adds https:// by default", () => {
    expect(ensureUrlHasSchema("example.com")).toBe("https://example.com")
  })

  it("ensureUrlHasSchema can use a custom scheme", () => {
    expect(ensureUrlHasSchema("example.com", "http")).toBe("http://example.com")
    expect(ensureUrlHasSchema("example.com", "http://")).toBe(
      "http://example.com",
    )
  })
})
