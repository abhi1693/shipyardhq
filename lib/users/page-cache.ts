import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getPublicUserProfile } from "@/actions/public/users/actions"
import { getRewardsLeaderboardPositionForUser } from "@/actions/public/rewards/actions"
import { format } from "date-fns"

type PublicUserProfile = NonNullable<
  Awaited<ReturnType<typeof getPublicUserProfile>>
>

type DirectoryProductItem = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  analytics: PublicUserProfile["products"][number]["analytics"] | null
  category?: { name?: string | null }
  verification?: PublicUserProfile["products"][number]["verification"] | null
  badges: string[]
  metaLabel?: string
  launchedAt: string | null
}

type BadgeSummary = {
  showcase: string[]
  overflow: number
}

type CategoryEntry = {
  name: string
  count: number
}

export type UserProfilePayload = {
  profile: PublicUserProfile
  leaderboardPosition: Awaited<
    ReturnType<typeof getRewardsLeaderboardPositionForUser>
  >
  products: DirectoryProductItem[]
  totalProducts: number
  totalUpvotes: number
  verifiedCount: number
  categories: CategoryEntry[]
  focusCategories: string[]
  extraCategoryCount: number
  badges: BadgeSummary
  recentLaunches: DirectoryProductItem[]
  earliestLaunch: string | null
}

const RECENT_LIMIT = 5
const BADGE_SHOWCASE_LIMIT = 6

export const getUserProfilePayload = cached(
  async (id: string): Promise<UserProfilePayload | null> => {
    const profile = await getPublicUserProfile(id)
    if (!profile) {
      return null
    }

    const leaderboardPosition = await getRewardsLeaderboardPositionForUser(
      profile.id,
    )

    const now = new Date()
    let totalUpvotes = 0
    let verifiedCount = 0

    const categoryCounts = new Map<string, number>()
    const badgeSet = new Set<string>()

    const products: DirectoryProductItem[] = profile.products.map((product) => {
      const upvotes = product.analytics?.upvotes ?? 0
      totalUpvotes += upvotes

      if (product.verification?.isVerified) {
        verifiedCount += 1
      }

      const categoryName = product.category?.name
      if (categoryName) {
        categoryCounts.set(
          categoryName,
          (categoryCounts.get(categoryName) ?? 0) + 1,
        )
      }

      const activeBadges = (product.ProductBadge ?? [])
        .filter((badge) => !badge.expiresAt || new Date(badge.expiresAt) > now)
        .map((badge) => {
          badgeSet.add(badge.badge)
          return badge.badge
        })

      const launchedAtRaw = product.publishedAt ?? product.createdAt ?? null
      const launchedAt = launchedAtRaw ? new Date(launchedAtRaw) : null
      const metaLabel = launchedAt
        ? format(launchedAt, "MMM d, yyyy")
        : undefined

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        logo: product.logo ?? "",
        tagline: product.tagline ?? "",
        analytics: product.analytics ?? null,
        category: product.category
          ? { name: product.category.name }
          : undefined,
        verification: product.verification ?? undefined,
        badges: activeBadges,
        metaLabel,
        launchedAt: launchedAt?.toISOString() ?? null,
      }
    })

    const totalProducts = products.length
    const categoryEntries = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const focusCategories = categoryEntries
      .slice(0, 4)
      .map((entry) => entry.name)
    const extraCategoryCount = Math.max(
      categoryEntries.length - focusCategories.length,
      0,
    )

    const uniqueBadges = Array.from(badgeSet)
    const badgeShowcase = uniqueBadges.slice(0, BADGE_SHOWCASE_LIMIT)
    const badgeOverflow = Math.max(
      uniqueBadges.length - badgeShowcase.length,
      0,
    )

    const sortedByDate = [...products].sort((a, b) => {
      const aTime = a.launchedAt ? new Date(a.launchedAt).getTime() : 0
      const bTime = b.launchedAt ? new Date(b.launchedAt).getTime() : 0
      return bTime - aTime
    })

    const recentLaunches = sortedByDate.slice(0, RECENT_LIMIT)
    const earliestLaunchISO =
      sortedByDate[sortedByDate.length - 1]?.launchedAt ?? null

    return {
      profile,
      leaderboardPosition,
      products,
      totalProducts,
      totalUpvotes,
      verifiedCount,
      categories: categoryEntries,
      focusCategories,
      extraCategoryCount,
      badges: {
        showcase: badgeShowcase,
        overflow: badgeOverflow,
      },
      recentLaunches,
      earliestLaunch: earliestLaunchISO,
    }
  },
  "users:profile:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([id]) => [id],
    tags: ([id]) => [TAGS.users, TAGS.user(id), TAGS.products],
  },
)
