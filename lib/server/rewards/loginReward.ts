import { awardRewards } from "@/lib/rewards/engine"
import { RewardsError } from "@/lib/rewards/errors"
import {
  dispatchEventAsync,
  registerEventHandler,
  type RewardsDailyLoginEvent,
} from "@/lib/server/events"

const LOGIN_RULE_KEY = "rewards.login.daily"
const NON_FATAL_CODES = new Set([
  "COOLDOWN_ACTIVE",
  "CAP_EXCEEDED",
  "RULE_NOT_FOUND",
  "RULE_INACTIVE",
])

const CACHE_SYMBOL = Symbol.for("__shipyard_login_reward_cache")

type LoginRewardCache = Map<string, string>

function getCache(): LoginRewardCache {
  const globalWithCache = globalThis as typeof globalThis & {
    [CACHE_SYMBOL]?: LoginRewardCache
  }
  if (!globalWithCache[CACHE_SYMBOL]) {
    globalWithCache[CACHE_SYMBOL] = new Map()
  }
  return globalWithCache[CACHE_SYMBOL]!
}

type EnsureDailyLoginRewardOptions = {
  now?: Date
}

export async function ensureDailyLoginReward(
  userId: string,
  options: EnsureDailyLoginRewardOptions = {},
) {
  if (!userId) return

  const now = options.now ?? new Date()
  const dayKey = now.toISOString().slice(0, 10)
  const cache = getCache()
  if (cache.get(userId) === dayKey) {
    return
  }

  const eventId = `${dayKey}:login`
  const payload: RewardsDailyLoginEvent = {
    userId,
    eventId,
    dayKey,
    awardedAt: now.toISOString(),
  }

  cache.set(userId, dayKey)

  dispatchEventAsync("rewards.daily-login", payload, {
    context: { userId, eventId },
    onError: (error) => {
      cache.delete(userId)
      console.error("[rewards] Failed to enqueue daily login rewards", {
        error,
        userId,
        eventId,
      })
    },
  })
}

export async function handleDailyLoginRewardEvent(
  payload: RewardsDailyLoginEvent,
) {
  try {
    await awardRewards(payload.userId, LOGIN_RULE_KEY, {
      eventId: payload.eventId,
      sourceType: "auth.login",
      sourceId: payload.eventId,
      targetType: "user",
      targetId: payload.userId,
      metadata: {
        awardedAt: payload.awardedAt,
        dayKey: payload.dayKey,
      },
    })
  } catch (error) {
    if (error instanceof RewardsError && NON_FATAL_CODES.has(error.code)) {
      if (error.code === "RULE_NOT_FOUND" || error.code === "RULE_INACTIVE") {
        console.warn("[rewards] Daily login rule unavailable", {
          userId: payload.userId,
          code: error.code,
        })
      }
      return
    }

    console.error("[rewards] Failed to award daily login rewards", {
      error,
      userId: payload.userId,
      eventId: payload.eventId,
    })
  }
}

registerEventHandler({
  event: "rewards.daily-login",
  id: "rewards.daily-login",
  mode: "async",
  handler: handleDailyLoginRewardEvent,
})
