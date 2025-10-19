import { describe, expect, it, vi, beforeEach } from "vitest"

import {
  ensureDailyLoginReward,
  handleDailyLoginRewardEvent,
} from "../loginReward"
import { awardRewards } from "@/lib/rewards/engine"
import { RewardsError } from "@/lib/rewards/errors"
import { dispatchEvent } from "@/lib/server/events"

vi.mock("@/lib/rewards/engine", () => ({
  awardRewards: vi.fn(),
}))

vi.mock("@/lib/server/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/events")>()
  return {
    ...actual,
    dispatchEvent: vi.fn().mockResolvedValue(undefined),
  }
})

const mockedAwardRewards = vi.mocked(awardRewards)
const mockedDispatchEvent = vi.mocked(dispatchEvent)
const CACHE_SYMBOL = Symbol.for("__shipyard_login_reward_cache")

describe("ensureDailyLoginReward", () => {
  beforeEach(() => {
    mockedAwardRewards.mockReset()
    mockedDispatchEvent.mockClear()
    const globalWithCache = globalThis as typeof globalThis & {
      [CACHE_SYMBOL]?: Map<string, string>
    }
    delete globalWithCache[CACHE_SYMBOL]
  })

  it("queues daily login reward once per day", async () => {
    const now = new Date("2025-03-15T08:30:00Z")

    await ensureDailyLoginReward("user-123", { now })

    expect(mockedDispatchEvent).toHaveBeenCalledWith(
      "rewards.daily-login",
      expect.objectContaining({
        userId: "user-123",
        eventId: "2025-03-15:login",
        dayKey: "2025-03-15",
      }),
    )

    // subsequent call same day should short-circuit before hitting awardRewards
    mockedDispatchEvent.mockClear()
    await ensureDailyLoginReward("user-123", { now })
    expect(mockedDispatchEvent).not.toHaveBeenCalled()
  })

  it("ignores cooldown and cap errors", async () => {
    mockedAwardRewards.mockRejectedValueOnce(
      new RewardsError("cooldown", "COOLDOWN_ACTIVE"),
    )

    await expect(
      handleDailyLoginRewardEvent({
        userId: "user-123",
        eventId: "2025-03-15:login",
        dayKey: "2025-03-15",
        awardedAt: "2025-03-15T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined()

    mockedAwardRewards.mockRejectedValueOnce(
      new RewardsError("capped", "CAP_EXCEEDED"),
    )

    await expect(
      handleDailyLoginRewardEvent({
        userId: "user-123",
        eventId: "2025-03-16:login",
        dayKey: "2025-03-16",
        awardedAt: "2025-03-16T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined()
  })

  it("logs and skips when rule missing or inactive", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockedAwardRewards.mockRejectedValueOnce(
      new RewardsError("missing", "RULE_NOT_FOUND"),
    )

    await expect(
      handleDailyLoginRewardEvent({
        userId: "user-123",
        eventId: "2025-03-17:login",
        dayKey: "2025-03-17",
        awardedAt: "2025-03-17T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("processes event payload via handler", async () => {
    const payload = {
      userId: "user-999",
      eventId: "2025-03-18:login",
      dayKey: "2025-03-18",
      awardedAt: "2025-03-18T05:00:00.000Z",
    }

    await expect(handleDailyLoginRewardEvent(payload)).resolves.toBeUndefined()

    expect(mockedAwardRewards).toHaveBeenCalledWith(
      "user-999",
      "rewards.login.daily",
      expect.objectContaining({
        eventId: "2025-03-18:login",
        metadata: expect.objectContaining({ dayKey: "2025-03-18" }),
        targetId: "user-999",
      }),
    )
  })
})
