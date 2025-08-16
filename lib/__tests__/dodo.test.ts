import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const OLD_ENV = process.env
beforeEach(() => {
  vi.resetModules()
  process.env = { ...OLD_ENV }
})
afterEach(() => {
  process.env = OLD_ENV
})

vi.mock("dodopayments", () => ({
  default: class DodoMock {
    opts: any
    constructor(opts: any) {
      this.opts = opts
    }
  },
}))

describe("dodo client", () => {
  it("uses test_mode when not production", async () => {
    process.env.NODE_ENV = "test"
    process.env.DODO_API_KEY = "k"
    const mod = await import("@/lib/dodo")
    expect((mod.dodoClient as any).opts.environment).toBe("test_mode")
  })

  it("uses live_mode when production", async () => {
    process.env.NODE_ENV = "production"
    process.env.DODO_API_KEY = "k"
    const mod = await import("@/lib/dodo")
    expect((mod.dodoClient as any).opts.environment).toBe("live_mode")
  })
})
