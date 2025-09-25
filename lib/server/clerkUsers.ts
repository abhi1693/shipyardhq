import type { User as ClerkUser } from "@clerk/backend"
import { clerkClient } from "@clerk/nextjs/server"
import { getRedisClient } from "@/lib/server/redis"

const CACHE_PREFIX = "clerk:user:"
const DEFAULT_TTL_SECONDS = 300

function resolveTtl(): number {
  const raw = process.env.CLERK_USER_CACHE_TTL_SECONDS
  if (!raw) {
    return DEFAULT_TTL_SECONDS
  }

  const parsed = Number.parseInt(raw, 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_TTL_SECONDS
}

function buildCacheKey(clerkId: string) {
  return `${CACHE_PREFIX}${clerkId}`
}

export async function getClerkUserByIdCached(
  clerkId: string,
): Promise<ClerkUser> {
  if (!clerkId) {
    throw new Error("Missing Clerk user ID")
  }

  const cacheKey = buildCacheKey(clerkId)
  const redis = await getRedisClient()

  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached) as ClerkUser
      }
    } catch (error) {
      console.error("Failed to read Clerk user from Redis cache", {
        clerkId,
        error,
      })
    }
  }

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(clerkId)

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(clerkUser), {
        EX: resolveTtl(),
      })
    } catch (error) {
      console.error("Failed to write Clerk user to Redis cache", {
        clerkId,
        error,
      })
    }
  }

  return clerkUser
}

export async function invalidateClerkUserCache(clerkId: string) {
  if (!clerkId) {
    return
  }

  const redis = await getRedisClient()
  if (!redis) {
    return
  }

  try {
    await redis.del(buildCacheKey(clerkId))
  } catch (error) {
    console.error("Failed to invalidate Clerk user cache", {
      clerkId,
      error,
    })
  }
}

export { CACHE_PREFIX as CLERK_USER_CACHE_PREFIX }
