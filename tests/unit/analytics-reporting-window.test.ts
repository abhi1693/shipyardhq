import { describe, expect, it } from "vitest"

import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  getAnalyticsReportingWindow,
  getCompletedAnalyticsWindow,
  getPreviousAnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"

const DAY_IN_MS = 24 * 60 * 60 * 1000

describe("analytics reporting window", () => {
  const referenceDate = new Date("2026-07-14T12:00:00Z")

  it("uses the configured number of completed UTC days", () => {
    const window = getAnalyticsReportingWindow(referenceDate)

    expect(window.days).toBe(ANALYTICS_REPORTING_WINDOW_DAYS)
    expect(window.endDate).toBe("2026-07-13")
    expect(
      (window.end.getTime() - window.start.getTime()) / DAY_IN_MS + 1,
    ).toBe(ANALYTICS_REPORTING_WINDOW_DAYS)
  })

  it("builds the previous contiguous window with the same duration", () => {
    const current = getAnalyticsReportingWindow(referenceDate)
    const previous = getPreviousAnalyticsReportingWindow(current)

    expect(previous.days).toBe(current.days)
    expect(previous.end.getTime() + DAY_IN_MS).toBe(current.start.getTime())
  })

  it("supports a longer reporting period without changing range logic", () => {
    const window = getCompletedAnalyticsWindow(45, referenceDate)

    expect(window.days).toBe(45)
    expect(window.startDate).toBe("2026-05-30")
    expect(window.endDate).toBe("2026-07-13")
  })
})
