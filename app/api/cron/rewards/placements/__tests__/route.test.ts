import { describe, it, expect, vi, beforeEach } from "vitest"

const schedulerMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/server/rewards/placementScheduler", () => ({
  runPlacementScheduler: schedulerMock,
}))

import { GET } from "../route"

describe("cron placement scheduler route", () => {
  beforeEach(() => {
    vi.resetModules()
    schedulerMock.mockReset()
    process.env.CRON_SECRET = "secret"
  })

  it("rejects unauthorized requests when secret is set", async () => {
    const res = await GET(new Request("https://example.com"))
    expect(res.status).toBe(401)
  })

  it("runs scheduler when authorized", async () => {
    schedulerMock.mockResolvedValue({
      activated: 1,
      expired: 2,
      activatedProductIds: ["p1"],
      expiredProductIds: ["p2"],
      badgesActivated: 1,
      badgesExpired: 0,
    })

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(200)
    expect(schedulerMock).toHaveBeenCalled()
    const json = await res.json()
    expect(json.activated).toBe(1)
    expect(json.expired).toBe(2)
  })

  it("handles scheduler failures", async () => {
    schedulerMock.mockRejectedValueOnce(new Error("boom"))

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})
