import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { validateExternalResources } from "@/lib/productWizard/validate"

class MockImage {
  onload: null | (() => void) = null
  onerror: null | (() => void) = null
  set src(_v: string) {
    // succeed by default next tick
    setTimeout(() => this.onload && this.onload(), 0)
  }
}

describe("validateExternalResources", () => {
  beforeEach(() => {
    global.Image = MockImage as any
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    // @ts-expect-error test: cleanup Image
    delete global.Image
    // @ts-expect-error test: cleanup fetch
    delete global.fetch
  })

  it("flags website without http and missing logo", async () => {
    const vals = { websiteUrl: "example.com", logo: "" } as any
    const p = validateExternalResources(vals)
    await vi.runAllTimersAsync()
    const res = await p
    expect(res.checks.websiteOk).toBe(false)
    expect(res.checks.logoOk).toBe(false)
    expect(
      res.issues.some((i) => i.toLowerCase().includes("website url")),
    ).toBe(true)
    expect(
      res.issues.some((i) => i.toLowerCase().includes("logo is required")),
    ).toBe(true)
  })

  it("passes when fetch ok and images load", async () => {
    vi.useRealTimers()
    // Mock fetch to return ok
    // @ts-expect-error test: override fetch
    global.fetch = vi.fn(async () => ({ ok: true }))
    const vals = {
      websiteUrl: "https://example.com",
      logo: "https://example.com/logo.png",
      ctaUrl: "https://example.com/cta",
    } as any
    const res = await validateExternalResources(vals)
    expect(res.issues).toEqual([])
    expect(res.checks.websiteOk).toBe(true)
    expect(res.checks.logoOk).toBe(true)
    expect((res.checks as any).ctaOk).toBe(true)
  })

  it("handles image load error and fetch errors gracefully", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("cors")
    })
    class ErrImage {
      onload: any
      onerror: any
      set src(_v: string) {
        setTimeout(() => this.onerror && this.onerror(new Error("x")), 0)
      }
    }
    global.Image = ErrImage as any
    const vals = {
      websiteUrl: "https://example.com",
      logo: "https://example.com/logo.png",
      bannerImage: "https://example.com/banner.png",
      ctaUrl: "https://example.com/cta",
    } as any
    const p = validateExternalResources(vals)
    await vi.runAllTimersAsync()
    const res = await p
    // fetch errors are treated as non-blocking
    expect((res.checks as any).ctaOk).toBe(true)
    // image errors produce issues
    expect(
      res.issues.some((m) => m.toLowerCase().includes("failed to load")),
    ).toBe(true)
  })

  it("resolves false when Image constructor throws", async () => {
    global.Image = class BadImage {
      constructor() {
        throw new Error("ctor")
      }
    } as any
    const res = await validateExternalResources({
      websiteUrl: "https://x.com",
      logo: "https://x/logo.png",
    } as any)
    expect(res.checks.logoOk).toBe(false)
  })
})
