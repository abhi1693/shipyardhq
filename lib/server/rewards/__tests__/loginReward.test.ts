import { describe, expect, it, vi, beforeEach } from "vitest"

import { ensureDailyLoginReward } from "../loginReward"
import { awardRewards } from "@/lib/rewards/engine"
import { RewardsError } from "@/lib/rewards/errors"

vi.mock("@/lib/rewards/engine", () => ({
  awardRewards: vi.fn(),
}))

const mockedAwardRewards = vi.mocked(awardRewards)
const CACHE_SYMBOL = Symbol.for("__shipyard_login_reward_cache")

describe("ensureDailyLoginReward", () => {
  beforeEach(() => {
    mockedAwardRewards.mockReset()
    const globalWithCache = globalThis as typeof globalThis & {
      [CACHE_SYMBOL]?: Map<string, string>
    }
    delete globalWithCache[CACHE_SYMBOL]
  })

  it("awards login rewards with stable event id per day", async () => {
    const now = new Date("2025-03-15T08:30:00Z")

    await ensureDailyLoginReward("user-123", { now })

    expect(mockedAwardRewards).toHaveBeenCalledWith(
      "user-123",
      "rewards.login.daily",
      expect.objectContaining({
        eventId: "2025-03-15:login",
        sourceType: "auth.login",
        targetType: "user",
        targetId: "user-123",
      }),
    )

    // subsequent call same day should short-circuit before hitting awardRewards
    mockedAwardRewards.mockClear()
    await ensureDailyLoginReward("user-123", { now })
    expect(mockedAwardRewards).not.toHaveBeenCalled()
  })

  it("ignores cooldown and cap errors", async () => {
    mockedAwardRewards.mockRejectedValueOnce(
      new RewardsError("cooldown", "COOLDOWN_ACTIVE"),
    )

    await expect(ensureDailyLoginReward("user-123")).resolves.toBeUndefined()

    mockedAwardRewards.mockRejectedValueOnce(
      new RewardsError("capped", "CAP_EXCEEDED"),
    )

    await expect(ensureDailyLoginReward("user-123")).resolves.toBeUndefined()
  })

  it("logs and skips when rule missing or inactive", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockedAwardRewards.mockRejectedValueOnce(
      new RewardsError("missing", "RULE_NOT_FOUND"),
    )

    await expect(ensureDailyLoginReward("user-123")).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
