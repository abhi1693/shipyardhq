import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const OLD_ENV = process.env as any

vi.mock("@prisma/extension-accelerate", () => ({
  withAccelerate: () => (client: any) => client,
}))

vi.mock("@prisma/client", () => ({
  PrismaClient: class MockClient {
    $extends() {
      return this
    }
  },
}))

describe("prisma singleton", () => {
  beforeEach(() => {
    vi.resetModules()
    ;(global as any).prisma = undefined
  })
  afterEach(() => {
    process.env = OLD_ENV
  })

  it("reuses instance in non-prod via global", async () => {
    process.env = { ...OLD_ENV, NODE_ENV: "development" }
    const mod1 = await import("@/lib/prisma")
    const first = mod1.default
    const mod2 = await import("@/lib/prisma")
    expect(mod2.default).toBe(first)
    expect((global as any).prisma).toBe(first)
  })

  it("does not set global in production", async () => {
    process.env = { ...OLD_ENV, NODE_ENV: "production" }
    const mod = await import("@/lib/prisma")
    expect((global as any).prisma).toBeUndefined()
    expect(mod.default).toBeTruthy()
  })
})
