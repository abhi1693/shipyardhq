import { beforeEach, describe, expect, it, vi } from "vitest"

const maintenanceMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/rewards/streakMaintenance", () => ({
  runStreakMaintenance: maintenanceMock,
}))

import { GET } from "../route"

describe("cron streak maintenance route", () => {
  beforeEach(() => {
    vi.resetModules()
    maintenanceMock.mockReset()
    process.env.CRON_SECRET = "secret"
  })

  it("rejects unauthorized requests when secret is set", async () => {
    const res = await GET(new Request("https://example.com"))
    expect(res.status).toBe(401)
  })

  it("returns maintenance summary when authorized", async () => {
    maintenanceMock.mockResolvedValue({
      evaluatedDay: "2025-04-01",
      evaluationRunAt: "2025-04-02T05:00:00.000Z",
      qualifyingUsers: 12,
      streaksExtended: 10,
      awardsCreated: 6,
      tiersAwarded: { bronze: 4, silver: 2 },
      triggerRuleTotals: {
        "rewards.login.daily": 12,
        "rewards.upvote.give": 4,
      },
      alreadyEvaluated: 1,
      streaksReset: 3,
      failures: [],
    })

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(200)
    expect(maintenanceMock).toHaveBeenCalled()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.streaksExtended).toBe(10)
    expect(json.qualifyingUsers).toBe(12)
  })

  it("handles maintenance failures", async () => {
    maintenanceMock.mockRejectedValueOnce(new Error("boom"))

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe("boom")
  })
})
