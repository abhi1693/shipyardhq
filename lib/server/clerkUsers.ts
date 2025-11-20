import type { User as ClerkUser } from "@clerk/backend"
import { clerkClient } from "@clerk/nextjs/server"
import { cacheHit, cacheMiss } from "@/lib/server/cache"
const DEFAULT_TTL_SECONDS = 300
const IN_PROCESS_TTL_MS = 5 * 60 * 1000

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
    inProcessTtlMs: IN_PROCESS_TTL_MS,
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
    inProcessTtlMs: IN_PROCESS_TTL_MS,
    onError: (error) => {
      console.error("Failed to write Clerk user to Redis cache", {
        clerkId,
        error,
      })
    },
  })

  return clerkUser
}
