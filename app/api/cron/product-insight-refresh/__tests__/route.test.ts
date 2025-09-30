import { beforeEach, describe, expect, it, vi } from "vitest"

const schedulerMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/productInsights/pipelineAutoScheduler", () => ({
  scheduleStaleProductInsightPipelines: schedulerMock,
}))

import { GET } from "../route"

describe("cron product insight refresh route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "top-secret"
    schedulerMock.mockReset()
  })

  it("rejects unauthorized requests", async () => {
    const res = await GET(new Request("https://example.com"))
    expect(res.status).toBe(401)
  })

  it("runs scheduler when authorized", async () => {
    schedulerMock.mockResolvedValueOnce({
      examined: 1,
      queued: 1,
      skipped: 0,
      limit: 25,
      staleAfterMs: 604800000,
      results: [],
    })

    const res = await GET(
      new Request("https://example.com?limit=5&staleDays=10", {
        headers: { authorization: "Bearer top-secret" },
      }),
    )

    expect(res.status).toBe(200)
    expect(schedulerMock).toHaveBeenCalledWith({
      limit: 5,
      staleAfterMs: 10 * 24 * 60 * 60 * 1000,
    })
    const payload = await res.json()
    expect(payload.success).toBe(true)
    expect(payload.queued).toBe(1)
  })

  it("returns 500 when scheduler fails", async () => {
    schedulerMock.mockRejectedValueOnce(new Error("boom"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer top-secret" },
      }),
    )

    expect(res.status).toBe(500)
    const payload = await res.json()
    expect(payload.success).toBe(false)

    errorSpy.mockRestore()
  })
})

