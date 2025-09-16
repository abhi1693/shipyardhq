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
  it("throws when DODO_ENV missing", async () => {
    process.env.DODO_API_KEY = "k"
    await expect(import("@/lib/dodo")).rejects.toThrow(
      /DODO_ENV environment variable is required/,
    )
  })

  it("throws when DODO_ENV invalid", async () => {
    process.env.DODO_API_KEY = "k"
    process.env.DODO_ENV = "sandbox"
    await expect(import("@/lib/dodo")).rejects.toThrow(
      /DODO_ENV must be set to 'live_mode' or 'test_mode'/,
    )
  })

  it("creates client with provided environment", async () => {
    process.env.DODO_API_KEY = "k"
    process.env.DODO_ENV = "test_mode"
    const mod = await import("@/lib/dodo")
    expect((mod.dodoClient as any).opts.environment).toBe("test_mode")
    expect((mod.dodoClient as any).opts.bearerToken).toBe("k")
  })
})
