import { describe, expect, it } from "vitest"

import {
  buildHourlyActivity,
  parseUtcHour,
} from "@/lib/server/analytics/hourlyActivity"

describe("hourly analytics activity", () => {
  it("normalizes minute timestamps to their UTC hour", () => {
    expect(parseUtcHour("2026-07-13T08:47:00Z")?.toISOString()).toBe(
      "2026-07-13T08:00:00.000Z",
    )
    expect(parseUtcHour("invalid")).toBeNull()
  })

  it("aggregates multiple reporting dates into a weekday-by-hour grid", () => {
    const activity = buildHourlyActivity([
      {
        timestamp: new Date("2026-07-06T10:00:00Z"),
        requests: 12,
        visits: 4,
      },
      {
        timestamp: new Date("2026-07-13T10:00:00Z"),
        requests: 18,
        visits: 7,
      },
      {
        timestamp: new Date("2026-07-12T23:00:00Z"),
        requests: 5,
        visits: 2,
      },
    ])

    expect(activity).toHaveLength(7 * 24)
    expect(
      activity.find((point) => point.weekday === 0 && point.hour === 10),
    ).toEqual({
      weekday: 0,
      weekdayLabel: "Monday",
      hour: 10,
      requests: 30,
      visits: 11,
    })
    expect(
      activity.find((point) => point.weekday === 6 && point.hour === 23),
    ).toEqual({
      weekday: 6,
      weekdayLabel: "Sunday",
      hour: 23,
      requests: 5,
      visits: 2,
    })
  })
})
