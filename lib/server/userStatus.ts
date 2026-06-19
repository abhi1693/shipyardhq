import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getRedisClient } from "@/lib/server/redis"
import { buildCacheKey } from "@/lib/server/cache"

export const INACTIVE_ACCOUNT_MESSAGE = "Account is not active"
export const SUSPENDED_ACCOUNT_PATH = "/auth/suspended"

const activeUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  onboardedAt: true,
  createdAt: true,
} as const

const ACTIVE_USER_CACHE_TTL_SECONDS = 120
const ACTIVE_USER_CACHE_NAMESPACE = "active-user"

export type ActiveUser = Awaited<ReturnType<typeof loadActiveUser>>

function buildActiveUserCacheKey(clerkId: string) {
  return buildCacheKey(ACTIVE_USER_CACHE_NAMESPACE, "clerk", clerkId)
}

async function loadActiveUser(clerkId: string) {
  if (!clerkId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: activeUserSelect,
  })

  if (!user || user.status !== "active") {
    return null
  }

  return user
}

export async function getActiveUserByClerkId(clerkId: string) {
  if (!clerkId) return null
  if (process.env.NODE_ENV === "test") {
    return loadActiveUser(clerkId)
  }

  const cacheKey = buildActiveUserCacheKey(clerkId)
  const client = await getRedisClient()
  if (client) {
    try {
      const cached = await client.get(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as ActiveUser | null
        if (parsed) {
          return parsed
        }

        try {
          await client.del(cacheKey)
        } catch {
          // Active-user cache is best-effort; Prisma remains the source of truth.
        }
      }
    } catch {
      // Active-user cache is best-effort; fall through to Prisma.
    }
  }

  const value = await loadActiveUser(clerkId)

  if (client) {
    try {
      if (value) {
        const payload = JSON.stringify(value)
        await client.set(cacheKey, payload, {
          EX: ACTIVE_USER_CACHE_TTL_SECONDS,
        })
      } else {
        await client.del(cacheKey)
      }
    } catch {
      // Active-user cache writes are best-effort.
    }
  }

  return value
}

export async function invalidateActiveUserCache(clerkId?: string | null) {
  if (!clerkId) return

  const client = await getRedisClient()
  if (!client) {
    return
  }

  const cacheKey = buildActiveUserCacheKey(clerkId)

  try {
    await client.del(cacheKey)
  } catch {
    // Active-user cache invalidation is best-effort.
  }
}

export async function requireActiveUserOrRedirect(clerkId?: string | null) {
  if (!clerkId) redirect(SUSPENDED_ACCOUNT_PATH)

  const user = await getActiveUserByClerkId(clerkId)
  if (!user) redirect(SUSPENDED_ACCOUNT_PATH)

  return user
}
