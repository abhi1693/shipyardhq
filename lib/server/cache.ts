import type { createClient } from "redis"
import { getRedisClient } from "@/lib/server/redis"

// Restrict to the subset of the Redis client we rely on so the helpers stay reusable.
type CacheClient = Pick<
  ReturnType<typeof createClient>,
  "get" | "set" | "del"
> & {
  isOpen?: boolean
}

type CacheErrorHandler = (error: unknown) => void

type CacheKeyPart = string | number | boolean
type CacheKeyArray = ReadonlyArray<CacheKeyPart | null | undefined>
type CacheKeyInput = string | CacheKeyArray
type InProcessCacheEntry = { value: unknown; expiresAt: number }

const inProcessCache = new Map<string, InProcessCacheEntry>()
const CACHE_DEBUG = process.env.CACHE_DEBUG?.trim() === "true"

function logCacheEvent(
  event: string,
  key: string,
  extra?: Record<string, unknown>,
) {
  if (!CACHE_DEBUG && event !== "error") {
    return
  }

  const context = { key, ...(extra ?? {}) }
  console.debug(`[cache] ${event}`, context)
}

const CACHE_ENV_PREFIX =
  process.env.CACHE_ENV_PREFIX?.trim() || process.env.NODE_ENV?.trim()
let cachedClientPromise: Promise<CacheClient | null> | null = null

function clientIsOpen(client: CacheClient | null): client is CacheClient {
  if (!client) {
    return false
  }

  if (typeof client.isOpen === "boolean") {
    return client.isOpen
  }

  return true
}

export function namespaceCacheKey(key: string): string {
  if (!CACHE_ENV_PREFIX) {
    return key
  }

  return `${CACHE_ENV_PREFIX}:${key}`
}

export function buildCacheKey(
  ...parts: Array<CacheKeyPart | null | undefined>
): string {
  const compositeKey = buildCacheKeyFromArray(parts)
  return namespaceCacheKey(compositeKey)
}

function buildCacheKeyFromArray(parts: CacheKeyArray): string {
  return parts
    .filter(
      (part): part is CacheKeyPart =>
        part !== null && part !== undefined && `${part}`.length > 0,
    )
    .map((part) => `${part}`)
    .join(":")
}

function resolveCacheKeyInput(key: CacheKeyInput): string {
  if (typeof key === "string") {
    return key
  }

  return buildCacheKey(...key)
}

async function resolveCacheClient(): Promise<CacheClient | null> {
  let attemptedReconnect = false

  while (true) {
    if (!cachedClientPromise) {
      cachedClientPromise = getRedisClient()
        .then((client) => (client ? (client as CacheClient) : null))
        .catch((error) => {
          cachedClientPromise = null
          throw error
        })
    }

    let client: CacheClient | null

    try {
      client = await cachedClientPromise
    } catch (error) {
      cachedClientPromise = null
      throw error
    }

    if (!client) {
      cachedClientPromise = null
      return null
    }

    if (clientIsOpen(client)) {
      return client
    }

    cachedClientPromise = null

    if (attemptedReconnect) {
      return null
    }

    attemptedReconnect = true
  }
}

interface CacheHitOptions<T> {
  key: CacheKeyInput
  deserialize?: (value: string) => T
  onError?: CacheErrorHandler
  client?: CacheClient | null
  inProcessTtlMs?: number
}

export async function cacheHit<T>({
  key,
  deserialize,
  onError,
  client: providedClient,
  inProcessTtlMs,
}: CacheHitOptions<T>): Promise<T | null> {
  const { client, namespacedKey } = await resolveClientForOperation({
    key,
    providedClient,
    onError,
  })

  if (!client) {
    return null
  }

  const parser = deserialize ?? (JSON.parse as (value: string) => T)
  const now = Date.now()

  if (inProcessTtlMs && inProcessTtlMs > 0) {
    const memo = inProcessCache.get(namespacedKey)
    if (memo && memo.expiresAt > now) {
      return memo.value as T
    }
  }

  try {
    const cached = await client.get(namespacedKey)
    if (!cached) {
      logCacheEvent("miss", namespacedKey)
      return null
    }

    logCacheEvent("hit", namespacedKey)
    const value = parser(cached)
    if (inProcessTtlMs && inProcessTtlMs > 0) {
      inProcessCache.set(namespacedKey, {
        value,
        expiresAt: now + inProcessTtlMs,
      })
    }

    return value
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
    return null
  }
}

interface CacheMissOptions<T> {
  key: CacheKeyInput
  value: T
  ttlSeconds?: number
  serialize?: (value: T) => string
  onError?: CacheErrorHandler
  client?: CacheClient | null
  inProcessTtlMs?: number
}

export async function cacheMiss<T>({
  key,
  value,
  ttlSeconds,
  serialize,
  onError,
  client: providedClient,
  inProcessTtlMs,
}: CacheMissOptions<T>): Promise<void> {
  const { client, namespacedKey } = await resolveClientForOperation({
    key,
    providedClient,
    onError,
  })

  const serializer = serialize ?? JSON.stringify
  const ttl =
    Number.isFinite(ttlSeconds) && ttlSeconds && ttlSeconds > 0
      ? ttlSeconds
      : undefined

  const now = Date.now()

  // If no client is available, still memoize in-process so repeated calls within
  // the TTL avoid extra work during builds when Redis is unavailable locally.
  if (!client) {
    if (inProcessTtlMs && inProcessTtlMs > 0) {
      inProcessCache.set(namespacedKey, {
        value,
        expiresAt: now + inProcessTtlMs,
      })
      logCacheEvent("store (in-process)", namespacedKey, {
        ttlSeconds: ttl ?? null,
      })
    }
    return
  }

  try {
    await client.set(
      namespacedKey,
      serializer(value),
      ttl ? { EX: ttl } : undefined,
    )
    logCacheEvent("store", namespacedKey, { ttlSeconds: ttl })
    if (inProcessTtlMs && inProcessTtlMs > 0) {
      inProcessCache.set(namespacedKey, {
        value,
        expiresAt: now + inProcessTtlMs,
      })
    }
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
  }
}

interface ClientResolutionOptions {
  key: CacheKeyInput
  onError?: CacheErrorHandler
  providedClient?: CacheClient | null
}

async function resolveClientForOperation({
  key,
  onError,
  providedClient,
}: ClientResolutionOptions): Promise<{
  client: CacheClient | null
  namespacedKey: string
}> {
  const namespacedKey = resolveCacheKeyInput(key)

  let client = providedClient
  if (typeof client === "undefined") {
    try {
      client = await resolveCacheClient()
    } catch (error) {
      logCacheEvent("error", namespacedKey, { error })
      onError?.(error)
      return { client: null, namespacedKey }
    }
  }

  if (!client) {
    logCacheEvent("skip (no client)", namespacedKey)
    return { client: null, namespacedKey }
  }

  return { client, namespacedKey }
}
