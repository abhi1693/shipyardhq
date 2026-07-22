import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"

describe("Next cache configuration", () => {
  it("does not retain Cache Components values in process", () => {
    expect(nextConfig.cacheMaxMemorySize).toBe(0)
  })

  it("keeps database-backed static generation within the pooler budget", () => {
    expect(nextConfig.experimental?.cpus).toBe(2)
    expect(nextConfig.experimental?.staticGenerationMaxConcurrency).toBe(2)
    expect(nextConfig.experimental?.staticGenerationMinPagesPerWorker).toBe(100)
  })
})
