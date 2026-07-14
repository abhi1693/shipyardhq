import { describe, expect, it } from "vitest"

import {
  capDailyLeaderboardTraffic,
  LEADERBOARD_DAILY_TRAFFIC_CAPS,
  LEADERBOARD_POINT_CAPS,
  scoreLeaderboardMetrics,
} from "@/lib/server/leaderboard/scoring"

describe("leaderboard scoring", () => {
  it("caps traffic entering the score on each stored day", () => {
    expect(
      capDailyLeaderboardTraffic({
        browserRequests: 50_000,
        browserVisits: 10_000,
      }),
    ).toEqual(LEADERBOARD_DAILY_TRAFFIC_CAPS)
  })

  it("gives browser traffic diminishing bounded points", () => {
    const scored = scoreLeaderboardMetrics({
      browserRequests: 1_000_000,
      browserVisits: 1_000_000,
      upvotes: 0,
    })

    expect(scored.components.browserRequestPoints).toBe(
      LEADERBOARD_POINT_CAPS.browserRequests,
    )
    expect(scored.components.browserVisitPoints).toBe(
      LEADERBOARD_POINT_CAPS.browserVisits,
    )
    expect(scored.score).toBe(
      LEADERBOARD_POINT_CAPS.browserRequests +
        LEADERBOARD_POINT_CAPS.browserVisits,
    )
  })

  it("keeps verified upvotes linear and uncapped", () => {
    const scored = scoreLeaderboardMetrics({
      browserRequests: 1,
      browserVisits: 1,
      upvotes: 50,
    })

    expect(scored.components.browserRequestPoints).toBe(2)
    expect(scored.components.browserVisitPoints).toBe(8)
    expect(scored.components.upvotePoints).toBe(500)
    expect(scored.score).toBe(510)
  })
})
