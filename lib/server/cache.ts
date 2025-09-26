import type { createClient } from "redis"
import { getRedisClient } from "@/lib/server/redis"

// Restrict to the subset of the Redis client we rely on so the helpers stay reusable.
type CacheClient = Pick<ReturnType<typeof createClient>, "get" | "set" | "del">

type CacheErrorHandler = (error: unknown) => void

type CacheKeyPart = string | number | boolean
type CacheKeyArray = ReadonlyArray<CacheKeyPart | null | undefined>
type CacheKeyInput = string | CacheKeyArray

function logCacheEvent(event: string, key: string, extra?: Record<string, unknown>) {
  const context = { key, ...(extra ?? {}) }
  console.debug(`[cache] ${event}`, context)
}

const CACHE_ENV_PREFIX =
  process.env.CACHE_ENV_PREFIX?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
  process.env.NODE_ENV?.trim()
let cachedClientPromise: Promise<CacheClient | null> | null = null

export function namespaceCacheKey(key: string): string {
  if (!CACHE_ENV_PREFIX) {
    return key
  }

  return `${CACHE_ENV_PREFIX}:${key}`
}

export function buildCacheKey(
  ...parts: Array<CacheKeyPart | null | undefined>
): string {
  return buildCacheKeyFromArray(parts)
}

function buildCacheKeyFromArray(parts: CacheKeyArray): string {
  return parts
    .filter((part): part is CacheKeyPart =>
      part !== null && part !== undefined && `${part}`.length > 0,
    )
    .map((part) => `${part}`)
    .join(":")
}

function resolveCacheKeyInput(key: CacheKeyInput): string {
  return Array.isArray(key) ? buildCacheKeyFromArray(key) : key
}

async function resolveCacheClient(): Promise<CacheClient | null> {
  if (!cachedClientPromise) {
    cachedClientPromise = getRedisClient()
      .then((client) => {
        if (!client) {
          cachedClientPromise = null
        }
        return client
      })
      .catch((error) => {
        cachedClientPromise = null
        throw error
      })
  }

  return cachedClientPromise
}

interface CacheHitOptions<T> {
  key: CacheKeyInput
  deserialize?: (value: string) => T
  onError?: CacheErrorHandler
  client?: CacheClient | null
}

export async function cacheHit<T>({
  key,
  deserialize,
  onError,
  client: providedClient,
}: CacheHitOptions<T>): Promise<T | null> {
  const { client, namespacedKey } = await resolveClientForOperation({
    key,
    providedClient,
    onError,
  })

  if (!client) {
    return null
  }

  const parser = (deserialize ?? (JSON.parse as (value: string) => T))

  try {
    const cached = await client.get(namespacedKey)
    if (!cached) {
      logCacheEvent("miss", namespacedKey)
      return null
    }

    logCacheEvent("hit", namespacedKey)

    return parser(cached)
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
}

export async function cacheMiss<T>({
  key,
  value,
  ttlSeconds,
  serialize,
  onError,
  client: providedClient,
}: CacheMissOptions<T>): Promise<void> {
  const { client, namespacedKey } = await resolveClientForOperation({
    key,
    providedClient,
    onError,
  })

  if (!client) {
    return
  }

  const serializer = serialize ?? JSON.stringify
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds && ttlSeconds > 0 ? ttlSeconds : undefined

  try {
    await client.set(namespacedKey, serializer(value), ttl ? { EX: ttl } : undefined)
    logCacheEvent("store", namespacedKey, { ttlSeconds: ttl })
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
  }
}

interface CacheInvalidateOptions {
  key: CacheKeyInput
  onError?: CacheErrorHandler
  client?: CacheClient | null
}

export async function cacheInvalidate({
  key,
  onError,
  client: providedClient,
}: CacheInvalidateOptions): Promise<void> {
  const { client, namespacedKey } = await resolveClientForOperation({
    key,
    providedClient,
    onError,
  })

  if (!client) {
    return
  }

  try {
    await client.del(namespacedKey)
    logCacheEvent("invalidate", namespacedKey)
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
  }
}

export function __resetCacheClientForTesting() {
  cachedClientPromise = null
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
  const rawKey = resolveCacheKeyInput(key)
  const namespacedKey = namespaceCacheKey(rawKey)

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
