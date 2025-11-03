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

function logCacheEvent(
  event: string,
  key: string,
  extra?: Record<string, unknown>,
) {
  const context = { key, ...(extra ?? {}) }
  console.debug(`[cache] ${event}`, context)
}

const CACHE_ENV_PREFIX =
  process.env.CACHE_ENV_PREFIX?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
  process.env.NODE_ENV?.trim()
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

  if (!client) {
    return
  }

  const serializer = serialize ?? JSON.stringify
  const ttl =
    Number.isFinite(ttlSeconds) && ttlSeconds && ttlSeconds > 0
      ? ttlSeconds
      : undefined

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
