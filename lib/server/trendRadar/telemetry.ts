import { getRedisClient } from "@/lib/server/redis"

const EMBED_TOTAL_KEY = "trend-radar:embed:total"
const EMBED_DAILY_KEY_PREFIX = "trend-radar:embed:daily:"

let missingRedisWarningIssued = false

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10)

/**
 * Increment aggregate counters so we can monitor how often the public iframe
 * is rendered across external properties. Falls back gracefully when Redis
 * is unavailable so the embed never errors.
 */
export async function recordTrendRadarEmbedView(date: Date = new Date()) {
  const redis = await getRedisClient()
  if (!redis) {
    if (!missingRedisWarningIssued) {
      console.warn(
        "[trendRadar] Redis unavailable; embed views will not be recorded",
      )
      missingRedisWarningIssued = true
    }
    return
  }

  const dailyKey = `${EMBED_DAILY_KEY_PREFIX}${formatDateKey(date)}`

  try {
    await redis
      .multi()
      .incr(EMBED_TOTAL_KEY)
      .incr(dailyKey)
      .exec()
  } catch (error) {
    console.error("[trendRadar] failed to record embed view", error)
  }
}
