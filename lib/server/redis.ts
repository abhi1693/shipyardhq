import { createClient, createSentinel } from "redis"

export type RedisClient =
  ReturnType<typeof createClient> | ReturnType<typeof createSentinel>

const globalForRedis = globalThis as unknown as {
  __redisClient?: RedisClient | null
  __redisClientPromise?: Promise<RedisClient> | null
  __redisDisabledUntil?: number
}

const REDIS_RETRY_BACKOFF_MS = 30_000
const NEXT_BUILD_PHASE = "phase-production-build"
const DEFAULT_REDIS_CONNECT_TIMEOUT_MS = 3_000
const REDIS_DEBUG = process.env.REDIS_DEBUG?.trim() === "true"

function resolveRedisUrl(): string | null {
  return (
    process.env.REDIS_URL?.trim() || process.env.REDIS_TLS_URL?.trim() || null
  )
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function resolveConnectTimeoutMs() {
  return (
    parseInteger(process.env.REDIS_CONNECT_TIMEOUT_MS) ??
    DEFAULT_REDIS_CONNECT_TIMEOUT_MS
  )
}

function createRedisSocketOptions() {
  return {
    connectTimeout: resolveConnectTimeoutMs(),
    reconnectStrategy: false as const,
  }
}

function parseSentinelNodes() {
  return process.env.REDIS_SENTINEL_NODES?.split(",")
    .map((node) => node.trim())
    .filter(Boolean)
    .map((node) => {
      const [host, port] = node.split(":")
      return {
        host,
        port: Number.parseInt(port || "26379", 10),
      }
    })
    .filter((node) => node.host && Number.isInteger(node.port))
}

function createRedisClient(): RedisClient | null {
  const sentinelName = process.env.REDIS_SENTINEL_NAME?.trim()
  const sentinelRootNodes = parseSentinelNodes()

  if (sentinelName && sentinelRootNodes && sentinelRootNodes.length > 0) {
    return createSentinel({
      name: sentinelName,
      sentinelRootNodes,
      nodeClientOptions: {
        database: parseInteger(process.env.REDIS_DB),
        socket: createRedisSocketOptions(),
      },
    })
  }

  const redisUrl = resolveRedisUrl()
  return redisUrl
    ? createClient({
        url: redisUrl,
        socket: createRedisSocketOptions(),
      })
    : null
}

function connectWithTimeout(client: RedisClient): Promise<RedisClient> {
  const timeoutMs = resolveConnectTimeoutMs()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try {
        client.destroy()
      } catch {
        // Ignore cleanup failures; the caller will fall back without Redis.
      }

      reject(new Error(`Redis connection timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    client
      .connect()
      .then(() => {
        clearTimeout(timeout)
        resolve(client)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

export async function getRedisClient(): Promise<RedisClient | null> {
  // Build should remain resilient even when external Redis isn't reachable.
  if (process.env.NEXT_PHASE === NEXT_BUILD_PHASE) {
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
    const client = createRedisClient()
    if (!client) {
      return null
    }

    client.on("error", (error) => {
      if (REDIS_DEBUG) {
        console.error("Redis client error", error)
      }
    })

    globalForRedis.__redisClientPromise = connectWithTimeout(client)
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
        if (REDIS_DEBUG) {
          console.error("Failed to connect to Redis", error)
        }
        throw error
      })
  }

  try {
    return await globalForRedis.__redisClientPromise
  } catch (error) {
    if (REDIS_DEBUG) {
      console.error("Redis connection attempt failed", error)
    }
    return null
  }
}

export async function closeRedisClient(): Promise<void> {
  const pendingClient = globalForRedis.__redisClientPromise
    ? await globalForRedis.__redisClientPromise.catch(() => null)
    : null
  const client = globalForRedis.__redisClient ?? pendingClient

  globalForRedis.__redisClient = null
  globalForRedis.__redisClientPromise = null
  globalForRedis.__redisDisabledUntil = 0

  if (!client?.isOpen) {
    return
  }

  if (typeof client.close === "function") {
    await client.close()
    return
  }

  client.destroy()
}
