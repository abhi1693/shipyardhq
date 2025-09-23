import { describe, expect, it } from "vitest"

import { isMonthKey, monthlyLeaderboardArchivePath } from "@/lib/routes"

describe("routes", () => {
  it("builds monthly leaderboard archive paths", () => {
    expect(monthlyLeaderboardArchivePath("2024-05")).toBe(
      "/leaderboard/2024-05",
    )
  })

  it("validates month keys", () => {
    expect(isMonthKey("2024-05")).toBe(true)
    expect(isMonthKey("2024-13")).toBe(false)
    expect(isMonthKey("invalid")).toBe(false)
    expect(isMonthKey(null)).toBe(false)
    expect(isMonthKey(undefined)).toBe(false)
  })
})
