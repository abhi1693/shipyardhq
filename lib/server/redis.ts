import { createClient } from "redis"

export type RedisClient = ReturnType<typeof createClient>

const globalForRedis = globalThis as unknown as {
  __redisClient?: RedisClient | null
  __redisClientPromise?: Promise<RedisClient> | null
  __redisDisabledUntil?: number
}

const REDIS_RETRY_BACKOFF_MS = 30_000
const NEXT_BUILD_PHASE = "phase-production-build"

function resolveRedisUrl(): string | null {
  return (
    process.env.REDIS_URL?.trim() || process.env.REDIS_TLS_URL?.trim() || null
  )
}

export async function getRedisClient(): Promise<RedisClient | null> {
  // Build should remain resilient even when external Redis isn't reachable.
  if (process.env.NEXT_PHASE === NEXT_BUILD_PHASE) {
    return null
  }

  const redisUrl = resolveRedisUrl()
  if (!redisUrl) {
    return null
  }

  const disabledUntil = globalForRedis.__redisDisabledUntil ?? 0
  if (disabledUntil > Date.now()) {
    return null
  }

  if (globalForRedis.__redisClient?.isOpen) {
    return globalForRedis.__redisClient
  }

  if (!globalForRedis.__redisClientPromise) {
    const client = createClient({ url: redisUrl })
    let didLogClientError = false
    client.on("error", (error) => {
      if (didLogClientError) return
      didLogClientError = true
      console.error("Redis client error", error)
    })

    globalForRedis.__redisClientPromise = client
      .connect()
      .then(() => {
        globalForRedis.__redisDisabledUntil = 0
        globalForRedis.__redisClient = client
        return client
      })
      .catch((error) => {
        globalForRedis.__redisClientPromise = null
        globalForRedis.__redisClient = null
        globalForRedis.__redisDisabledUntil =
          Date.now() + REDIS_RETRY_BACKOFF_MS
        console.error("Failed to connect to Redis", error)
        throw error
      })
  }

  try {
    return await globalForRedis.__redisClientPromise
  } catch (error) {
    console.error("Redis connection attempt failed", error)
    return null
  }
}
