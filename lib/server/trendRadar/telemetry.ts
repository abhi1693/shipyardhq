import { buildCacheKey, namespaceCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"

const TOTAL_KEY = namespaceCacheKey(
  buildCacheKey("trend-radar", "embed", "total"),
)

const buildDailyKey = (suffix: string) =>
  namespaceCacheKey(
    buildCacheKey("trend-radar", "embed", "daily", suffix),
  )

let missingRedisWarningIssued = false

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseCount = (value: string | null) => {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export interface TrendRadarEmbedStats {
  available: boolean
  totalEmbeds: number
  windowDays: number
  windowTotal: number
  daily: Array<{ date: string; count: number }>
}

const DEFAULT_WINDOW_DAYS = 7

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

  const suffix = formatDateKey(date)
  const dailyKey = buildDailyKey(suffix)

  try {
    const multi = redis.multi()
    multi.incr(TOTAL_KEY)
    multi.incr(dailyKey)
    await multi.exec()
  } catch (error) {
    console.error("[trendRadar] failed to record embed view", error)
  }
}

/**
 * Fetch aggregate embed counts for the trend radar iframe.
 * Returns a rolling daily breakdown plus total impressions.
 */
export async function getTrendRadarEmbedStats(
  days = DEFAULT_WINDOW_DAYS,
): Promise<TrendRadarEmbedStats> {
  const redis = await getRedisClient()
  if (!redis) {
    return {
      available: false,
      totalEmbeds: 0,
      windowDays: days,
      windowTotal: 0,
      daily: [],
    }
  }

  try {
    const windowDays = Math.max(1, days)
    const totalEmbeds = parseCount(await redis.get(TOTAL_KEY))

    const reference = new Date()
    reference.setHours(0, 0, 0, 0)

    const keys: string[] = []
    const dateLabels: string[] = []

    for (let offset = windowDays - 1; offset >= 0; offset--) {
      const target = new Date(reference)
      target.setDate(reference.getDate() - offset)
      const dailyKey = formatDateKey(target)
      keys.push(buildDailyKey(dailyKey))
      dateLabels.push(dailyKey)
    }

    const results = keys.length > 0 ? await redis.mGet(keys) : []
    const daily = dateLabels.map((label, index) => ({
      date: label,
      count: parseCount(results[index] ?? null),
    }))

    const windowTotal = daily.reduce((sum, entry) => sum + entry.count, 0)

    return {
      available: true,
      totalEmbeds,
      windowDays,
      windowTotal,
      daily,
    }
  } catch (error) {
    console.error("[trendRadar] failed to fetch embed stats", error)
    return {
      available: false,
      totalEmbeds: 0,
      windowDays: days,
      windowTotal: 0,
      daily: [],
    }
  }
}
