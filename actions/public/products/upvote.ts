import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"
import { toggleVoteState } from "@/lib/server/productVotesStore"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

export type UpvoteState = { upvotes: number; upvoted: boolean; error?: string }

type CachedActiveUser = Awaited<ReturnType<typeof getActiveUserByClerkId>>

type ActiveUserCacheEntry = {
  value: CachedActiveUser
  expiresAt: number
}

const ACTIVE_USER_CACHE_TTL = 120_000

function getActiveUserCache(): Map<string, ActiveUserCacheEntry> {
  const globalWithCache = globalThis as typeof globalThis & {
    __shipyardActiveUserCache?: Map<string, ActiveUserCacheEntry>
  }

  if (!globalWithCache.__shipyardActiveUserCache) {
    globalWithCache.__shipyardActiveUserCache = new Map()
  }

  return globalWithCache.__shipyardActiveUserCache
}

async function getCachedActiveUser(clerkId: string) {
  if (!clerkId) return null
  if (process.env.NODE_ENV === "test") return getActiveUserByClerkId(clerkId)

  const cache = getActiveUserCache()
  const cached = cache.get(clerkId)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const result = await getActiveUserByClerkId(clerkId)
  cache.set(clerkId, { value: result, expiresAt: now + ACTIVE_USER_CACHE_TTL })
  return result
}

export interface ToggleProductUpvoteOptions {
  productId: string
  clerkUserId: string
}

export class UpvoteError extends Error {
  status: number
  constructor(
    message: string,
    status: number,
    public cause?: unknown,
  ) {
    super(message)
    this.name = "UpvoteError"
    this.status = status
  }
}

export async function toggleProductUpvote({
  productId,
  clerkUserId,
}: ToggleProductUpvoteOptions): Promise<UpvoteState> {
  if (!productId) {
    throw new UpvoteError("Missing productId", 400)
  }

  if (!clerkUserId) {
    throw new UpvoteError("Unauthorized", 401)
  }

  const user = await getCachedActiveUser(clerkUserId)
  if (!user) {
    throw new UpvoteError(INACTIVE_ACCOUNT_MESSAGE, 403)
  }

  try {
    const { previousState, newState, upvotes } = await toggleVoteState({
      productId,
      userId: user.id,
    })

    const stateChanged = newState !== previousState
    if (stateChanged) {
      revalidateProduct(productId)
      revalidateLeaderboard()
    }

    return { upvotes, upvoted: newState === "upvoted" }
  } catch (err: any) {
    if (err?.code === "P2003") {
      throw new UpvoteError("Not Found", 404, err)
    }
    console.error("Upvote toggle error:", err)
    throw new UpvoteError(err?.message || "Failed", 500, err)
  }
}
