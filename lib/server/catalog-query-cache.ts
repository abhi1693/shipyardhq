import { createHash } from "node:crypto"

import { buildCacheKey, cacheGetOrSet } from "@/lib/server/cache"

type CatalogMemoryEntry = {
  expiresAt: number
  value: unknown
}

type CatalogCacheState = {
  entries: Map<string, CatalogMemoryEntry>
}

const MAX_MEMORY_ENTRIES = 64

const globalForCatalogCache = globalThis as typeof globalThis & {
  __catalogQueryCache?: CatalogCacheState
}

const catalogCache =
  globalForCatalogCache.__catalogQueryCache ??
  (globalForCatalogCache.__catalogQueryCache = { entries: new Map() })

function stableSerialize(value: unknown): string {
  if (value === null) return "null"

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString())
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => typeof entry !== "undefined")
      .sort(([left], [right]) => left.localeCompare(right))

    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`
  }

  if (typeof value === "bigint") {
    return JSON.stringify(value.toString())
  }

  return JSON.stringify(value)
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of catalogCache.entries) {
    if (entry.expiresAt <= now) {
      catalogCache.entries.delete(key)
    }
  }
}

function rememberValue<T>(key: string, value: T, ttlSeconds: number) {
  const now = Date.now()
  pruneExpiredEntries(now)

  if (catalogCache.entries.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = catalogCache.entries.keys().next().value
    if (typeof oldestKey === "string") {
      catalogCache.entries.delete(oldestKey)
    }
  }

  catalogCache.entries.set(key, {
    expiresAt: now + ttlSeconds * 1_000,
    value,
  })
}

export function buildCatalogQueryCacheKey(scope: string, input?: unknown) {
  const signature = createHash("sha256")
    .update(stableSerialize(input ?? null))
    .digest("hex")
    .slice(0, 20)

  return buildCacheKey("catalog-query", "v1", scope, signature)
}

export function deserializeCatalogJson<T>(value: string): T {
  return JSON.parse(value, (key, entry) => {
    if (
      typeof entry === "string" &&
      key.endsWith("At") &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry)
    ) {
      return new Date(entry)
    }

    return entry
  }) as T
}

export async function cacheCatalogQuery<T>({
  key,
  ttlSeconds,
  loader,
}: {
  key: string
  ttlSeconds: number
  loader: () => Promise<T>
}): Promise<T> {
  const now = Date.now()
  const memoryEntry = catalogCache.entries.get(key)

  if (memoryEntry && memoryEntry.expiresAt > now) {
    return memoryEntry.value as T
  }

  if (memoryEntry) {
    catalogCache.entries.delete(key)
  }

  const value = await cacheGetOrSet<T>({
    key,
    ttlSeconds,
    deserialize: deserializeCatalogJson<T>,
    loader,
    onError: (error) => {
      console.error("[catalog-cache] shared cache operation failed", {
        key,
        error,
      })
    },
  })

  rememberValue(key, value, ttlSeconds)
  return value
}

export function clearCatalogQueryMemoryCache() {
  catalogCache.entries.clear()
}
