import { describe, expect, it, vi, beforeEach } from "vitest"

import { ensureDailyLoginReward } from "../loginReward"
import { awardPoints } from "@/lib/points/engine"
import { PointsError } from "@/lib/points/errors"

vi.mock("@/lib/points/engine", () => ({
  awardPoints: vi.fn(),
}))

const mockedAwardPoints = vi.mocked(awardPoints)
const CACHE_SYMBOL = Symbol.for("__shipyard_login_reward_cache")

describe("ensureDailyLoginReward", () => {
  beforeEach(() => {
    mockedAwardPoints.mockReset()
    const globalWithCache = globalThis as typeof globalThis & {
      [CACHE_SYMBOL]?: Map<string, string>
    }
    delete globalWithCache[CACHE_SYMBOL]
  })

  it("awards login points with stable event id per day", async () => {
    const now = new Date("2025-03-15T08:30:00Z")

    await ensureDailyLoginReward("user-123", { now })

    expect(mockedAwardPoints).toHaveBeenCalledWith(
      "user-123",
      "points.login.daily",
      expect.objectContaining({
        eventId: "2025-03-15:login",
        sourceType: "auth.login",
        targetType: "user",
        targetId: "user-123",
      }),
    )

    // subsequent call same day should short-circuit before hitting awardPoints
    mockedAwardPoints.mockClear()
    await ensureDailyLoginReward("user-123", { now })
    expect(mockedAwardPoints).not.toHaveBeenCalled()
  })

  it("ignores cooldown and cap errors", async () => {
    mockedAwardPoints.mockRejectedValueOnce(
      new PointsError("cooldown", "COOLDOWN_ACTIVE"),
    )

    await expect(ensureDailyLoginReward("user-123")).resolves.toBeUndefined()

    mockedAwardPoints.mockRejectedValueOnce(
      new PointsError("capped", "CAP_EXCEEDED"),
    )

    await expect(ensureDailyLoginReward("user-123")).resolves.toBeUndefined()
  })

  it("logs and skips when rule missing or inactive", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockedAwardPoints.mockRejectedValueOnce(
      new PointsError("missing", "RULE_NOT_FOUND"),
    )

    await expect(ensureDailyLoginReward("user-123")).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
