import { describe, expect, it } from "vitest"

import {
  normalizeGaHostname,
  resolveExcludedGaHostnames,
} from "@/lib/analytics/gaHostnames"

describe("GA hostname filters", () => {
  it("normalizes local hostnames with ports and schemes", () => {
    expect(normalizeGaHostname("127.0.0.1:3002")).toBe("127.0.0.1")
    expect(normalizeGaHostname("http://localhost:3000/products/test")).toBe(
      "localhost",
    )
    expect(normalizeGaHostname("[::1]:3002")).toBe("::1")
    expect(normalizeGaHostname("HTTPS://Preview.Example.com/path")).toBe(
      "preview.example.com",
    )
  })

  it("keeps localhost excluded by default and accepts configured hosts", () => {
    expect(
      resolveExcludedGaHostnames("127.0.0.1:3002, staging.example.com"),
    ).toEqual(["localhost", "127.0.0.1", "::1", "staging.example.com"])
  })
})
