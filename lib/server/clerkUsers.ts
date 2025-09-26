import type { User as ClerkUser } from "@clerk/backend"
import { clerkClient } from "@clerk/nextjs/server"
import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
  cacheInvalidate,
} from "@/lib/server/cache"
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

export async function getClerkUserByIdCached(
  clerkId: string,
): Promise<ClerkUser> {
  if (!clerkId) {
    throw new Error("Missing Clerk user ID")
  }

  const cachedUser = await cacheHit<ClerkUser>({
    key: ["clerk", "user", clerkId],
    onError: (error) => {
      console.error("Failed to read Clerk user from Redis cache", {
        clerkId,
        error,
      })
    },
  })

  if (cachedUser) {
    return cachedUser
  }

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(clerkId)

  await cacheMiss({
    key: ["clerk", "user", clerkId],
    value: clerkUser,
    ttlSeconds: resolveTtl(),
    onError: (error) => {
      console.error("Failed to write Clerk user to Redis cache", {
        clerkId,
        error,
      })
    },
  })

  return clerkUser
}

export async function invalidateClerkUserCache(clerkId: string) {
  if (!clerkId) {
    return
  }

  await cacheInvalidate({
    key: ["clerk", "user", clerkId],
    onError: (error) => {
      console.error("Failed to invalidate Clerk user cache", {
        clerkId,
        error,
      })
    },
  })
}

export const CLERK_USER_CACHE_PREFIX = `${buildCacheKey("clerk", "user")}:`
