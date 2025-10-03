import { awardPoints } from "@/lib/points/engine"
import { PointsError } from "@/lib/points/errors"

const LOGIN_RULE_KEY = "points.login.daily"
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

  try {
    await awardPoints(userId, LOGIN_RULE_KEY, {
      eventId,
      sourceType: "auth.login",
      sourceId: eventId,
      targetType: "user",
      targetId: userId,
      metadata: {
        awardedAt: now.toISOString(),
        dayKey,
      },
    })
    cache.set(userId, dayKey)
  } catch (error) {
    if (error instanceof PointsError) {
      if (NON_FATAL_CODES.has(error.code)) {
        if (error.code === "COOLDOWN_ACTIVE" || error.code === "CAP_EXCEEDED") {
          cache.set(userId, dayKey)
        }
        if (error.code === "RULE_NOT_FOUND" || error.code === "RULE_INACTIVE") {
          console.warn("[points] Daily login rule unavailable", {
            userId,
            code: error.code,
          })
        }
        return
      }
    }

    console.error("[points] Failed to award daily login points", {
      error,
      userId,
      eventId,
    })
  }
}
