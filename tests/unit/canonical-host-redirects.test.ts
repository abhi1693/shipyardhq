// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks")
  Object.assign(globalThis, { AsyncLocalStorage })
})
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server"
vi.mock("@dualmark/nextjs", () => ({
  withDualmark: (config: unknown) => config,
}))
import nextConfig from "../../next.config"

async function responseFor(url: string) {
  return unstable_getResponseFromNextConfig({ url, nextConfig })
}

describe("canonical production hostname", () => {
  it.each([
    "/",
    "/why-shipyard",
    "/products/example",
    "/pricing?utm_source=newsletter&plan=pro",
    "/auth/callback?code=example&state=opaque",
    "/member/products/example?payment_id=test",
  ])(
    "permanently redirects www%s with its path and query intact",
    async (path) => {
      const response = await responseFor(`https://www.shipyardhq.dev${path}`)
      expect(response.status).toBe(308)
      expect(getRedirectUrl(response)).toBe(`https://shipyardhq.dev${path}`)
    },
  )

  it("upgrades HTTP www to HTTPS apex", async () => {
    expect(
      getRedirectUrl(
        await responseFor("http://www.shipyardhq.dev/why-shipyard?q=test"),
      ),
    ).toBe("https://shipyardhq.dev/why-shipyard?q=test")
  })

  it.each([
    ["/rank-in-public?q=test", "/browse?q=test"],
    ["/products/example/updates", "/products/example"],
    ["/rewards/example", "/"],
    ["/leaderboard/30-11-2025", "/leaderboard/monthly/2025/11"],
  ])("resolves legacy www%s in one redirect", async (path, destination) => {
    const response = await responseFor(`https://www.shipyardhq.dev${path}`)
    expect(response.status).toBe(308)
    expect(getRedirectUrl(response)).toBe(
      `https://shipyardhq.dev${destination}`,
    )
    expect(
      getRedirectUrl(await responseFor(`https://shipyardhq.dev${destination}`)),
    ).toBeNull()
  })

  it.each([
    "https://shipyardhq.dev",
    "http://localhost:3000",
    "https://staging.shipyardhq.dev",
    "https://www.staging.shipyardhq.dev",
  ])("leaves %s callbacks and public URLs alone", async (origin) => {
    for (const path of [
      "/",
      "/why-shipyard",
      "/auth/callback?code=example&state=opaque",
      "/api/webhooks/dodo",
    ]) {
      expect(getRedirectUrl(await responseFor(`${origin}${path}`))).toBeNull()
    }
  })

  it("preserves existing apex path redirects", async () => {
    expect(
      getRedirectUrl(
        await responseFor("https://shipyardhq.dev/rank-in-public?q=test"),
      ),
    ).toBe("https://shipyardhq.dev/browse?q=test")
  })
})
