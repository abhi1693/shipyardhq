import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const { countMock, groupByMock, findFirstMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  groupByMock: vi.fn(),
  findFirstMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: countMock,
      groupBy: groupByMock,
      findFirst: findFirstMock,
    },
  },
}))

import { getOnboardingAnswersSummary } from "@/lib/server/analytics/onboardingSummary"

describe("getOnboardingAnswersSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-04-20T00:00:00.000Z"))
    countMock.mockReset()
    groupByMock.mockReset()
    findFirstMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("aggregates onboarding responses with friendly labels", async () => {
    countMock
      .mockResolvedValueOnce(40) // total active
      .mockResolvedValueOnce(25) // completed
      .mockResolvedValueOnce(6) // last 7 days

    groupByMock
      .mockResolvedValueOnce([
        {
          roleIntent: "launch-product",
          _count: { roleIntent: 12 },
        },
        {
          roleIntent: "custom-intent",
          _count: { roleIntent: 5 },
        },
      ])
      .mockResolvedValueOnce([
        {
          heardFrom: "twitter",
          _count: { heardFrom: 10 },
        },
        {
          heardFrom: "other",
          _count: { heardFrom: 8 },
        },
      ])

    findFirstMock.mockResolvedValue({
      termsAcceptedAt: new Date("2024-04-18T15:00:00.000Z"),
      updatedAt: new Date("2024-04-18T16:00:00.000Z"),
    })

    const summary = await getOnboardingAnswersSummary()

    expect(summary.totalActiveUsers).toBe(40)
    expect(summary.completedResponses).toBe(25)
    expect(summary.pendingUsers).toBe(15)
    expect(summary.completedLast7Days).toBe(6)
    expect(summary.lastResponseAt).toBe("2024-04-18T15:00:00.000Z")
    expect(summary.completionRate).toBeCloseTo((25 / 40) * 100)

    expect(summary.roleIntentBreakdown).toEqual([
      {
        value: "launch-product",
        label: "Launch a product",
        count: 12,
        percentage: (12 / 25) * 100,
      },
      {
        value: "custom-intent",
        label: "Custom Intent",
        count: 5,
        percentage: (5 / 25) * 100,
      },
    ])

    expect(summary.heardFromBreakdown).toEqual([
      {
        value: "twitter",
        label: "Twitter / X",
        count: 10,
        percentage: (10 / 25) * 100,
      },
      {
        value: "other",
        label: "Other",
        count: 8,
        percentage: (8 / 25) * 100,
      },
    ])

    expect(countMock).toHaveBeenCalledTimes(3)
    expect(groupByMock).toHaveBeenCalledTimes(2)
    expect(findFirstMock).toHaveBeenCalledTimes(1)
  })

  it("handles absence of responses", async () => {
    countMock
      .mockResolvedValueOnce(0) // total active
      .mockResolvedValueOnce(0) // completed
      .mockResolvedValueOnce(0) // last 7 days

    groupByMock.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    findFirstMock.mockResolvedValue(null)

    const summary = await getOnboardingAnswersSummary()

    expect(summary.totalActiveUsers).toBe(0)
    expect(summary.completedResponses).toBe(0)
    expect(summary.pendingUsers).toBe(0)
    expect(summary.completionRate).toBe(0)
    expect(summary.roleIntentBreakdown).toEqual([])
    expect(summary.heardFromBreakdown).toEqual([])
    expect(summary.lastResponseAt).toBeNull()
  })
})
