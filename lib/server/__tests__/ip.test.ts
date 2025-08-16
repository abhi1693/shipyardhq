import { describe, it, expect, beforeEach, vi } from "vitest"

let current: Record<string, string | undefined> = {}
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (k: string) => current[k.toLowerCase()],
  }),
}))

import { getClientIp } from "@/lib/server/ip"

describe("getClientIp", () => {
  beforeEach(() => {
    current = {}
  })

  it("uses x-forwarded-for first entry", async () => {
    current["x-forwarded-for"] = "1.2.3.4, 5.6.7.8"
    await expect(getClientIp()).resolves.toBe("1.2.3.4")
  })

  it("falls back to x-real-ip then cf-connecting-ip", async () => {
    current["x-real-ip"] = "9.9.9.9"
    await expect(getClientIp()).resolves.toBe("9.9.9.9")
    current = { "cf-connecting-ip": "7.7.7.7" } as any
    await expect(getClientIp()).resolves.toBe("7.7.7.7")
  })

  it("returns default when no headers", async () => {
    await expect(getClientIp()).resolves.toBe("0.0.0.0")
  })
})
