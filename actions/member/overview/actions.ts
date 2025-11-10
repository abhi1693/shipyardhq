import { auth } from "@clerk/nextjs/server"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { getMemberTrafficSummary as fetchMemberTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import type { ProductTrafficSummary } from "@/types/analytics"
import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
} from "@/lib/server/cache"

type UserRef = { id: string }

async function getCurrentUser(): Promise<UserRef> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await requireActiveUserOrRedirect(userId)
  return { id: user.id }
}

export async function getMemberTrafficOverview(days = 7, userId?: string) {
  let resolvedUserId = userId
  if (!resolvedUserId) {
    const { id } = await getCurrentUser()
    resolvedUserId = id
  }

  const cacheEntry = await readMemberTrafficOverviewCache(
    resolvedUserId,
    days,
  )
  const now = Date.now()

  if (cacheEntry) {
    const age = now - cacheEntry.generatedAt
    if (age <= MEMBER_TRAFFIC_OVERVIEW_MAX_AGE_MS) {
      if (age >= MEMBER_TRAFFIC_OVERVIEW_STALE_AFTER_MS) {
        void refreshMemberTrafficOverviewCache(resolvedUserId, days)
      }
      return cacheEntry.summary
    }
  }

  const summary = await refreshMemberTrafficOverviewCache(resolvedUserId, days)
  return summary
}

type MemberTrafficOverviewCacheEntry = {
  summary: ProductTrafficSummary
  generatedAt: number
}

const MEMBER_TRAFFIC_OVERVIEW_CACHE_NAMESPACE = "member-traffic-overview"
const MEMBER_TRAFFIC_OVERVIEW_STALE_AFTER_MS = 2 * 60 * 1000
const MEMBER_TRAFFIC_OVERVIEW_MAX_AGE_MS = 30 * 60 * 1000
const MEMBER_TRAFFIC_OVERVIEW_CACHE_SECONDS = Math.ceil(
  MEMBER_TRAFFIC_OVERVIEW_MAX_AGE_MS / 1000,
)

const globalMemberTrafficCache = globalThis as unknown as {
  __memberTrafficRefreshPromises?: Map<string, Promise<ProductTrafficSummary>>
  __memberTrafficMemoryCache?: Map<string, MemberTrafficOverviewCacheEntry>
}

function getMemberTrafficRefreshMap() {
  if (!globalMemberTrafficCache.__memberTrafficRefreshPromises) {
    globalMemberTrafficCache.__memberTrafficRefreshPromises = new Map()
  }
  return globalMemberTrafficCache.__memberTrafficRefreshPromises
}

function getMemberTrafficMemoryCache() {
  if (!globalMemberTrafficCache.__memberTrafficMemoryCache) {
    globalMemberTrafficCache.__memberTrafficMemoryCache = new Map()
  }
  return globalMemberTrafficCache.__memberTrafficMemoryCache
}

function buildMemberTrafficCacheKey(userId: string, days: number) {
  return buildCacheKey(
    MEMBER_TRAFFIC_OVERVIEW_CACHE_NAMESPACE,
    userId,
    `days:${days}`,
  )
}

async function readMemberTrafficOverviewCache(
  userId: string,
  days: number,
) {
  const key = buildMemberTrafficCacheKey(userId, days)
  const memoryCache = getMemberTrafficMemoryCache()
  const memoryEntry = memoryCache.get(key)
  if (
    memoryEntry &&
    Date.now() - memoryEntry.generatedAt <= MEMBER_TRAFFIC_OVERVIEW_MAX_AGE_MS
  ) {
    return memoryEntry
  }

  const entry = await cacheHit<MemberTrafficOverviewCacheEntry>({
    key: buildMemberTrafficCacheKey(userId, days),
    onError: (error) => {
      console.error(
        "[member][overview] Failed to read traffic overview cache",
        { userId, days, error },
      )
    },
  })

  if (entry) {
    memoryCache.set(key, entry)
  }

  return entry
}

async function writeMemberTrafficOverviewCache(
  userId: string,
  days: number,
  summary: ProductTrafficSummary,
) {
  const key = buildMemberTrafficCacheKey(userId, days)
  const entry: MemberTrafficOverviewCacheEntry = {
    summary,
    generatedAt: Date.now(),
  }
  getMemberTrafficMemoryCache().set(key, entry)

  return cacheMiss({
    key,
    value: entry,
    ttlSeconds: MEMBER_TRAFFIC_OVERVIEW_CACHE_SECONDS,
    onError: (error) => {
      console.error(
        "[member][overview] Failed to write traffic overview cache",
        { userId, days, error },
      )
    },
  })
}

async function refreshMemberTrafficOverviewCache(userId: string, days: number) {
  const refreshMap = getMemberTrafficRefreshMap()
  const refreshKey = `${userId}:${days}`
  if (refreshMap.has(refreshKey)) {
    return refreshMap.get(refreshKey)!
  }

  const refreshPromise = (async () => {
    const summary = await fetchMemberTrafficSummary(userId, {
      rangeDays: days,
      previousComparison: false,
      includeAdvanced: false,
      includeEngagement: true,
      includeProductBreakdown: false,
      includeReferrerMatrix: false,
    })
    await writeMemberTrafficOverviewCache(userId, days, summary)
    return summary
  })().finally(() => {
    refreshMap.delete(refreshKey)
  })

  refreshMap.set(refreshKey, refreshPromise)
  return refreshPromise
}
