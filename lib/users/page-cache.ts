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
const FOCUS_CATEGORY_LIMIT = 4

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
    const seenBadges = new Set<string>()
    const badgeShowcase: string[] = []
    let badgeOverflow = 0

    const recentLaunchCandidates: Array<{
      time: number
      item: DirectoryProductItem
    }> = []
    const insertRecentLaunch = (item: DirectoryProductItem, time: number) => {
      let index = 0
      while (
        index < recentLaunchCandidates.length &&
        recentLaunchCandidates[index].time >= time
      ) {
        index += 1
      }
      recentLaunchCandidates.splice(index, 0, { time, item })
      if (recentLaunchCandidates.length > RECENT_LIMIT) {
        recentLaunchCandidates.pop()
      }
    }

    const products: DirectoryProductItem[] = []
    let earliestLaunchISO: string | null = null
    let earliestLaunchTime = Number.POSITIVE_INFINITY

    for (const product of profile.products) {
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

      const activeBadges: string[] = []
      for (const badge of product.ProductBadge ?? []) {
        if (badge.expiresAt && new Date(badge.expiresAt) <= now) {
          continue
        }
        const badgeName = badge.badge
        if (!seenBadges.has(badgeName)) {
          seenBadges.add(badgeName)
          if (badgeShowcase.length < BADGE_SHOWCASE_LIMIT) {
            badgeShowcase.push(badgeName)
          } else {
            badgeOverflow += 1
          }
        }
        activeBadges.push(badgeName)
      }

      const launchedAtRaw = product.publishedAt ?? product.createdAt ?? null
      const launchedAt = launchedAtRaw ? new Date(launchedAtRaw) : null
      const launchTime = launchedAt ? launchedAt.getTime() : 0
      if (launchTime <= earliestLaunchTime) {
        earliestLaunchTime = launchTime
        earliestLaunchISO = launchedAt ? launchedAt.toISOString() : null
      }
      const metaLabel = launchedAt ? format(launchedAt, "MMM d, yyyy") : undefined
      const directoryItem: DirectoryProductItem = {
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

      products.push(directoryItem)
      insertRecentLaunch(directoryItem, launchTime)
    }

    const totalProducts = products.length
    const categoryEntries = Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const focusCategories: string[] = []
    for (const entry of categoryEntries) {
      if (focusCategories.length >= FOCUS_CATEGORY_LIMIT) {
        break
      }
      focusCategories.push(entry.name)
    }
    const extraCategoryCount = Math.max(
      categoryEntries.length - focusCategories.length,
      0,
    )

    const recentLaunches = recentLaunchCandidates.map(({ item }) => item)
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
