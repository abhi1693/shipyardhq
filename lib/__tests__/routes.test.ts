import { describe, expect, it } from "vitest"

import { isMonthKey, monthlyLeaderboardArchivePath } from "@/lib/routes"

describe("routes", () => {
  it("builds monthly leaderboard archive paths", () => {
    expect(monthlyLeaderboardArchivePath("31-05-2024")).toBe(
      "/leaderboard/31-05-2024",
    )
  })

  it("validates month keys", () => {
    expect(isMonthKey("31-05-2024")).toBe(true)
    expect(isMonthKey("30-02-2024")).toBe(false)
    expect(isMonthKey("2024-05")).toBe(false)
    expect(isMonthKey("invalid")).toBe(false)
    expect(isMonthKey(null)).toBe(false)
    expect(isMonthKey(undefined)).toBe(false)
  })
})
