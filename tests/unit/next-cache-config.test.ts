import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"

describe("Next cache configuration", () => {
  it("does not retain Cache Components values in process", () => {
    expect(nextConfig.cacheMaxMemorySize).toBe(0)
  })
})
