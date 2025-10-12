import { beforeEach, describe, expect, it, vi } from "vitest"

const sendEmailMock = vi.hoisted(() => vi.fn())
const getAppBaseUrlMock = vi.hoisted(() => vi.fn(() => "https://app.test"))
const redisSetMock = vi.hoisted(() => vi.fn())

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/email/utils", () => ({
  getAppBaseUrl: getAppBaseUrlMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: vi.fn(async () => ({
    set: redisSetMock,
  })),
}))

vi.mock("@/lib/routes", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/routes")>("@/lib/routes")
  return {
    ...actual,
  }
})

import { sendUserReengagementEmails } from "@/lib/server/email/userReengagement"

describe("sendUserReengagementEmails", () => {
  const now = new Date("2024-04-10T12:00:00Z")

  beforeEach(() => {
    sendEmailMock.mockReset()
    redisSetMock.mockReset()
    prismaMock.user.findMany.mockReset()
  })

  it("sends reengagement email when last login matches milestone", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "sailor@example.com",
        firstName: "Kai",
        lastName: "Sailor",
        rewardTransactions: [{ createdAt: new Date("2024-04-03T10:00:00Z") }],
      },
    ])
    redisSetMock.mockResolvedValueOnce("OK")

    const result = await sendUserReengagementEmails(now)

    expect(result).toEqual({ sent: 1, skipped: 0 })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0].to).toBe("sailor@example.com")
    expect(redisSetMock).toHaveBeenCalledWith(
      "test:user:reengagement:7:user-1",
      now.toISOString(),
      { NX: true, EX: 60 * 60 * 24 * 365 },
    )
    expect(sendEmailMock.mock.calls[0][0].react.props.milestone).toBe(7)
    expect(sendEmailMock.mock.calls[0][0].react.props.memberRewardsUrl).toBe(
      "https://app.test/member/rewards",
    )
  })

  it("skips when milestone not reached", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "sailor@example.com",
        firstName: "Kai",
        lastName: "Sailor",
        rewardTransactions: [{ createdAt: new Date("2024-04-08T00:00:00Z") }],
      },
    ])

    const result = await sendUserReengagementEmails(now)

    expect(result).toEqual({ sent: 0, skipped: 0 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("deduplicates via redis when key already set", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "sailor@example.com",
        firstName: "Kai",
        lastName: "Sailor",
        rewardTransactions: [{ createdAt: new Date("2024-04-03T09:00:00Z") }],
      },
    ])
    redisSetMock.mockResolvedValueOnce(null)

    const result = await sendUserReengagementEmails(now)

    expect(result).toEqual({ sent: 0, skipped: 1 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("skip users missing login reward record", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "sailor@example.com",
        firstName: "Kai",
        lastName: "Sailor",
        rewardTransactions: [],
      },
    ])

    const result = await sendUserReengagementEmails(now)

    expect(result).toEqual({ sent: 0, skipped: 1 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
