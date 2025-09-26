import { createClient } from "redis"

export type RedisClient = ReturnType<typeof createClient>

const globalForRedis = globalThis as unknown as {
  __redisClient?: RedisClient | null
  __redisClientPromise?: Promise<RedisClient> | null
}

function resolveRedisUrl(): string | null {
  return (
    process.env.REDIS_URL?.trim() ||
    process.env.REDIS_TLS_URL?.trim() ||
    null
  )
}

export async function getRedisClient(): Promise<RedisClient | null> {
  const redisUrl = resolveRedisUrl()
  if (!redisUrl) {
    return null
  }

  if (globalForRedis.__redisClient?.isOpen) {
    return globalForRedis.__redisClient
  }

  if (!globalForRedis.__redisClientPromise) {
    const client = createClient({ url: redisUrl })
    client.on("error", (error) => {
      console.error("Redis client error", error)
    })

    globalForRedis.__redisClientPromise = client
      .connect()
      .then(() => {
        globalForRedis.__redisClient = client
        return client
      })
      .catch((error) => {
        globalForRedis.__redisClientPromise = null
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
