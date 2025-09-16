import { describe, it, expect, vi, beforeEach } from "vitest"

const expireMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/server/planExpiration", () => ({
  expireBoostedPlans: expireMock,
}))

import { GET } from "../route"

describe("cron expire plans route", () => {
  beforeEach(() => {
    vi.resetModules()
    expireMock.mockReset()
    process.env.CRON_SECRET = "secret"
  })

  it("rejects unauthorized requests when secret set", async () => {
    const res = await GET(new Request("https://example.com"))
    expect(res.status).toBe(401)
  })

  it("expires plans when authorized", async () => {
    expireMock.mockResolvedValue({ count: 2, expired: [] })
    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.count).toBe(2)
    expect(expireMock).toHaveBeenCalled()
  })
})
