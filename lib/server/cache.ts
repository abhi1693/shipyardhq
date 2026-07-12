import type { createClient } from "redis"
import { getRedisClient } from "@/lib/server/redis"

// Restrict to the subset of the Redis client we rely on so the helpers stay reusable.
type CacheClient = Pick<
  ReturnType<typeof createClient>,
  "get" | "set" | "del" | "scan" | "scanIterator"
> & {
  isOpen?: boolean
}

type CacheErrorHandler = (error: unknown) => void

type CacheKeyPart = string | number | boolean
type CacheKeyArray = ReadonlyArray<CacheKeyPart | null | undefined>
type CacheKeyInput = string | CacheKeyArray
type CacheScanOptions = { MATCH: string; COUNT: number }
type CacheScanIterator = (
  this: unknown,
  options: CacheScanOptions,
) => AsyncIterable<string | string[]>

type CacheScan = (
  cursor: string,
  options: CacheScanOptions,
) => Promise<{ cursor: string | number; keys: string[] }>

// This only coalesces concurrent misses. It never retains resolved values and
// every entry is removed in cacheGetOrSet's finally block.
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

  const parser = deserialize ?? (JSON.parse as (value: string) => T)

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

  const serializer = serialize ?? JSON.stringify
  const ttl =
    Number.isFinite(ttlSeconds) && ttlSeconds && ttlSeconds > 0
      ? ttlSeconds
      : undefined

  if (!client) {
    return
  }

  try {
    await client.set(
      namespacedKey,
      serializer(value),
      ttl ? { EX: ttl } : undefined,
    )
    logCacheEvent("store", namespacedKey, { ttlSeconds: ttl })
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
  }
}

interface CacheGetOrSetOptions<T> {
  key: CacheKeyInput
  ttlSeconds?: number
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

async function* scanKeysByPrefix(
  client: CacheClient,
  prefix: string,
): AsyncIterable<string[]> {
  const options = {
    MATCH: `${prefix}*`,
    COUNT: 100,
  }

  const scanIterator = client.scanIterator as unknown
  if (typeof scanIterator === "function") {
    for await (const keys of (scanIterator as CacheScanIterator).call(
      client,
      options,
    )) {
      const batch = Array.isArray(keys) ? keys : [keys]
      if (batch.length) {
        yield batch
      }
    }
    return
  }

  const scan = client.scan as unknown
  if (typeof scan !== "function") {
    return
  }

  let cursor = "0"
  do {
    const reply = await (scan as CacheScan).call(client, cursor, options)
    cursor = `${reply.cursor}`
    if (reply.keys.length) {
      yield reply.keys
    }
  } while (cursor !== "0")
}

export async function invalidateCacheByPrefix({
  keyPrefix,
  onError,
  client: providedClient,
}: InvalidateCachePrefixOptions): Promise<{
  prefix: string
  redisKeysDeleted: number
}> {
  const resolvedPrefix = resolveCacheKeyInput(keyPrefix)
  const { client, namespacedKey } = await resolveClientForOperation({
    key: resolvedPrefix,
    providedClient,
    onError,
  })

  if (!client) {
    return {
      prefix: namespacedKey,
      redisKeysDeleted: 0,
    }
  }

  let redisKeysDeleted = 0

  try {
    for await (const batch of scanKeysByPrefix(client, namespacedKey)) {
      redisKeysDeleted += await client.del(batch)
    }
    logCacheEvent("invalidate prefix", namespacedKey, { redisKeysDeleted })
  } catch (error) {
    logCacheEvent("error", namespacedKey, { error })
    onError?.(error)
  }

  return {
    prefix: namespacedKey,
    redisKeysDeleted,
  }
}

export async function cacheGetOrSet<T>({
  key,
  ttlSeconds,
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
