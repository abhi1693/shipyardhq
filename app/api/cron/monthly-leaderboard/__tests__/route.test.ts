import { beforeEach, describe, expect, it, vi } from "vitest"

const generateMock = vi.hoisted(() => vi.fn())
const notifyMock = vi.hoisted(() => vi.fn())
const revalidateMock = vi.hoisted(() => vi.fn())
const parseMonthKeyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/monthlyLeaderboard", () => ({
  generateMonthlyLeaderboard: generateMock,
  notifyMonthlyWinners: notifyMock,
  parseMonthKey: parseMonthKeyMock,
}))

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateMonthlyLeaderboard: revalidateMock,
}))

import { GET } from "../route"

describe("cron monthly leaderboard route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "secret"
    generateMock.mockReset()
    notifyMock.mockReset()
    revalidateMock.mockReset()
    parseMonthKeyMock.mockReset()
    parseMonthKeyMock.mockReturnValue(undefined)
  })

  it("rejects when authorization is missing", async () => {
    const res = await GET(new Request("https://example.com"))
    expect(res.status).toBe(401)
  })

  it("generates leaderboard when authorized", async () => {
    generateMock.mockResolvedValue({
      monthKey: "30-04-2024",
      month: new Date("2024-04-01T00:00:00.000Z"),
      start: new Date("2024-04-01T00:00:00.000Z"),
      end: new Date("2024-05-01T00:00:00.000Z"),
      limit: 10,
      count: 0,
      rankings: [],
    })
    notifyMock.mockResolvedValue({
      notified: 0,
      recipients: [],
      alreadyNotified: false,
    })

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(200)
    expect(generateMock).toHaveBeenCalled()
    expect(revalidateMock).toHaveBeenCalledWith("30-04-2024")
    expect(notifyMock).toHaveBeenCalled()
    const payload = await res.json()
    expect(payload.notification).toEqual({
      notified: 0,
      recipients: [],
      alreadyNotified: false,
    })
  })

  it("passes parsed month and limit parameters", async () => {
    const monthDate = new Date("2024-03-01T00:00:00.000Z")
    parseMonthKeyMock.mockReturnValue(monthDate)
    generateMock.mockResolvedValue({
      monthKey: "31-03-2024",
      month: monthDate,
      start: monthDate,
      end: new Date("2024-04-01T00:00:00.000Z"),
      limit: 25,
      count: 0,
      rankings: [],
    })
    notifyMock.mockResolvedValue({
      notified: 0,
      recipients: [],
      alreadyNotified: false,
    })

    const res = await GET(
      new Request("https://example.com?month=31-03-2024&limit=25", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(200)
    expect(generateMock).toHaveBeenCalledWith({ month: monthDate, limit: 25 })
  })

  it("returns 500 when generation fails", async () => {
    generateMock.mockRejectedValue(new Error("boom"))
    notifyMock.mockResolvedValue({
      notified: 0,
      recipients: [],
      alreadyNotified: false,
    })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(500)
    const payload = await res.json()
    expect(payload.success).toBe(false)
    expect(notifyMock).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })
})
