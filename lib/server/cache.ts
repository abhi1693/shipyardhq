import type { createClient } from "redis"
import { getRedisClient } from "@/lib/server/redis"

// Restrict to the subset of the Redis client we rely on so the helpers stay reusable.
type CacheClient = Pick<
  ReturnType<typeof createClient>,
  "get" | "set" | "del" | "scanIterator"
> & {
  isOpen?: boolean
}

type CacheErrorHandler = (error: unknown) => void

type CacheKeyPart = string | number | boolean
type CacheKeyArray = ReadonlyArray<CacheKeyPart | null | undefined>
type CacheKeyInput = string | CacheKeyArray
type InProcessCacheEntry = { value: unknown; expiresAt: number }
type CacheScanOptions = { MATCH: string; COUNT: number }
type CacheScanIterator = (
  this: unknown,
  options: CacheScanOptions,
) => AsyncIterable<string | string[]>

const inProcessCache = new Map<string, InProcessCacheEntry>()
const pendingLoads = new Map<string, Promise<unknown>>()
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
  const resolvedKey = resolveCacheKeyInput(key)
  const now = Date.now()

  if (inProcessTtlMs && inProcessTtlMs > 0) {
    const memo = inProcessCache.get(resolvedKey)
    if (memo && memo.expiresAt > now) {
      logCacheEvent("hit (in-process)", resolvedKey)
      return memo.value as T
    }

    if (memo) {
      inProcessCache.delete(resolvedKey)
    }
  }

  const { client, namespacedKey } = await resolveClientForOperation({
    key,
    providedClient,
    onError,
  })

  if (!client) {
    return null
  }

  const parser = deserialize ?? (JSON.parse as (value: string) => T)

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

interface CacheGetOrSetOptions<T> {
  key: CacheKeyInput
  ttlSeconds?: number
  inProcessTtlMs?: number
  deserialize?: (value: string) => T
  serialize?: (value: T) => string
  onError?: CacheErrorHandler
  loader: () => Promise<T>
}

interface InvalidateCachePrefixOptions {
  keyPrefix: CacheKeyInput
  onError?: CacheErrorHandler
  client?: CacheClient | null
}

function clearInProcessCacheByPrefix(prefix: string) {
  let deleted = 0

  for (const key of inProcessCache.keys()) {
    if (!key.startsWith(prefix)) continue
    inProcessCache.delete(key)
    deleted += 1
  }

  for (const key of pendingLoads.keys()) {
    if (!key.startsWith(prefix)) continue
    pendingLoads.delete(key)
  }

  return deleted
}

export async function invalidateCacheByPrefix({
  keyPrefix,
  onError,
  client: providedClient,
}: InvalidateCachePrefixOptions): Promise<{
  prefix: string
  redisKeysDeleted: number
  inProcessKeysDeleted: number
}> {
  const resolvedPrefix = resolveCacheKeyInput(keyPrefix)
  const inProcessKeysDeleted = clearInProcessCacheByPrefix(resolvedPrefix)
  const { client, namespacedKey } = await resolveClientForOperation({
    key: resolvedPrefix,
    providedClient,
    onError,
  })

  if (!client) {
    return {
      prefix: namespacedKey,
      redisKeysDeleted: 0,
      inProcessKeysDeleted,
    }
  }

  let redisKeysDeleted = 0

  try {
    const scanIterator = client.scanIterator as unknown as CacheScanIterator
    for await (const keys of scanIterator.call(client, {
      MATCH: `${namespacedKey}*`,
      COUNT: 100,
    })) {
      const batch = Array.isArray(keys) ? keys : [keys]
      if (!batch.length) continue
      redisKeysDeleted += await client.del(batch)
    }
    logCacheEvent("invalidate prefix", namespacedKey, {
      redisKeysDeleted,
      inProcessKeysDeleted,
    })
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
  }

  return {
    prefix: namespacedKey,
    redisKeysDeleted,
    inProcessKeysDeleted,
  }
}

export async function cacheGetOrSet<T>({
  key,
  ttlSeconds,
  inProcessTtlMs,
  deserialize,
  serialize,
  onError,
  loader,
}: CacheGetOrSetOptions<T>): Promise<T> {
  const namespacedKey = resolveCacheKeyInput(key)
  const cached = await cacheHit<T>({
    key,
    deserialize,
    onError,
    inProcessTtlMs,
  })

  if (cached !== null) {
    return cached
  }

  const existingLoad = pendingLoads.get(namespacedKey)
  if (existingLoad) {
    return existingLoad as Promise<T>
  }

  const load = (async () => {
    const fresh = await loader()
    await cacheMiss({
      key,
      value: fresh,
      ttlSeconds,
      serialize,
      onError,
      inProcessTtlMs,
    })

    return fresh
  })()

  pendingLoads.set(namespacedKey, load)

  try {
    return await load
  } finally {
    pendingLoads.delete(namespacedKey)
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
