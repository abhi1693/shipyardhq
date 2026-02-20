import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type { UserProductsPageResult } from "@/lib/generated/fastapi/schemas"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type BadgeSummary = {
  showcase: string[]
  overflow: number
}

type CategoryEntry = {
  name: string
  count: number
}

type PublicUserProfile = {
  id: string
  clerkId: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  productCount: number
}

type RewardsLeaderboardPosition = {
  rank: number
  totalEligible: number
  lifetimeEarned: number
  launchCount: number
}

export type UserProfilePayload = {
  profile: PublicUserProfile
  leaderboardPosition: RewardsLeaderboardPosition | null
  productsPage: UserProductsPageResult
  totalProducts: number
  totalUpvotes: number
  totalVerifiedRevenueCents: number
  totalVerifiedRevenueCurrency: string | null
  rewardPoints: number
  verifiedCount: number
  categories: CategoryEntry[]
  focusCategories: string[]
  extraCategoryCount: number
  badges: BadgeSummary
  earliestLaunch: string | null
}

const isFastApiNotFound = (error: unknown) => {
  const status = (error as FastApiError | undefined)?.status
  return status === 404 || status === 422
}

const fetchUserProfilePayload = async (
  id: string,
): Promise<UserProfilePayload | null> => {
  try {
    const response = await fastapiFetch<ApiResponse<UserProfilePayload>>(
      `/api/v1/public/users/${encodeURIComponent(id)}/payload`,
      { method: "GET" },
    )
    if (response.status !== 200) {
      return null
    }
    return response.data ?? null
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return null
    }
    throw error
  }
}

export const getUserProfilePayload = cached(
  async (id: string): Promise<UserProfilePayload | null> =>
    fetchUserProfilePayload(id),
  "users:profile:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([id]) => [id],
    tags: ([id]) => [TAGS.users, TAGS.user(id), TAGS.products],
  },
)
