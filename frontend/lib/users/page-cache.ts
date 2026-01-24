import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicUserProfile,
  getUserProductsPage,
  type UserProductsPageResult,
} from "@/actions/public/users/actions"
import { getRewardsLeaderboardPositionForUser } from "@/lib/rewards/leaderboard-position"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  convertToUsdCents,
  getUsdConversionRates,
} from "@/lib/server/payments/currency"

type PublicUserProfile = NonNullable<
  Awaited<ReturnType<typeof getPublicUserProfile>>
>

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

const BADGE_SHOWCASE_LIMIT = 6
const FOCUS_CATEGORY_LIMIT = 4

export const getUserProfilePayload = cached(
  async (id: string): Promise<UserProfilePayload | null> => {
    const profile = await getPublicUserProfile(id)
    if (!profile) {
      return null
    }

    const publishedProductWhere: Prisma.ProductWhereInput = {
      userId: profile.id,
      status: "published",
    }

    const [
      leaderboardPosition,
      upvoteAggregate,
      verifiedCount,
      categoryCounts,
      activeBadges,
      earliestLaunchRow,
      productsPage,
      verifiedRevenueConnectors,
      rewardBalance,
    ] = await Promise.all([
      getRewardsLeaderboardPositionForUser(profile.id),
      prisma.productAnalytics.aggregate({
        where: { product: { is: publishedProductWhere } },
        _sum: { upvotes: true },
      }),
      prisma.product.count({
        where: {
          ...publishedProductWhere,
          verification: { is: { isVerified: true } },
        },
      }),
      prisma.category.findMany({
        where: {
          products: { some: publishedProductWhere },
        },
        select: {
          name: true,
          _count: {
            select: {
              products: {
                where: publishedProductWhere,
              },
            },
          },
        },
      }),
      prisma.productBadge.findMany({
        where: {
          product: { is: publishedProductWhere },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          badge: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.$queryRaw<{ earliest: Date | null }[]>`
        SELECT MIN(COALESCE("publishedAt", "createdAt")) as "earliest"
        FROM "Product"
        WHERE "userId" = ${profile.id} AND "status" = 'published'
      `,
      getUserProductsPage({ userId: profile.id }),
      prisma.paymentConnector.findMany({
        where: {
          product: {
            userId: profile.id,
            status: "published",
          },
          status: "active",
          verifiedAt: { not: null },
        },
        select: {
          latestAllTimeRevenueCents: true,
          latestCurrencyCode: true,
          revenueHistory: {
            orderBy: { periodStart: "desc" },
            take: 1,
            select: {
              allTimeRevenueCents: true,
              currencyCode: true,
            },
          },
        },
      }),
      prisma.rewardBalance.findUnique({
        where: { userId: profile.id },
        select: { balance: true },
      }),
    ])

    const totalUpvotes = upvoteAggregate._sum.upvotes ?? 0
    const totalProducts = Math.max(
      profile._count?.products ?? 0,
      productsPage.total ?? 0,
    )

    const categoryEntries = categoryCounts
      .map((category: { name: string; _count: { products: number } }) => ({
        name: category.name,
        count: category._count.products,
      }))
      .sort(
        (
          a: { name: string; count: number },
          b: { name: string; count: number },
        ) => b.count - a.count,
      )

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

    const badgeShowcase: string[] = []
    let badgeOverflow = 0
    const seenBadges = new Set<string>()
    for (const badge of activeBadges) {
      if (seenBadges.has(badge.badge)) {
        continue
      }
      seenBadges.add(badge.badge)
      if (badgeShowcase.length < BADGE_SHOWCASE_LIMIT) {
        badgeShowcase.push(badge.badge)
      } else {
        badgeOverflow += 1
      }
    }

    const earliestLaunchValue = earliestLaunchRow[0]?.earliest ?? null
    const earliestLaunch = earliestLaunchValue
      ? new Date(earliestLaunchValue).toISOString()
      : null

    const needsRates = verifiedRevenueConnectors.some(
      (connector: {
        latestCurrencyCode?: string | null
        revenueHistory?: Array<{ currencyCode?: string | null }> | null
      }) => {
        const code =
          connector.latestCurrencyCode ??
          connector.revenueHistory?.[0]?.currencyCode ??
          "USD"
        return code && code.toUpperCase() !== "USD"
      },
    )
    const rates = needsRates
      ? await getUsdConversionRates()
      : new Map<string, number>([["USD", 1]])

    let totalVerifiedRevenueCents = 0
    for (const connector of verifiedRevenueConnectors as Array<{
      latestAllTimeRevenueCents?: number | null
      latestCurrencyCode?: string | null
      revenueHistory?: Array<{
        allTimeRevenueCents?: number | null
        currencyCode?: string | null
      }> | null
    }>) {
      const snapshot = connector.revenueHistory?.[0]
      const amount =
        typeof connector.latestAllTimeRevenueCents === "number"
          ? connector.latestAllTimeRevenueCents
          : typeof snapshot?.allTimeRevenueCents === "number"
            ? snapshot.allTimeRevenueCents
            : null

      if (amount === null) continue

      const currency =
        connector.latestCurrencyCode ?? snapshot?.currencyCode ?? "USD"
      const currencyCode = currency?.toUpperCase?.() ?? "USD"

      if (currencyCode === "USD") {
        totalVerifiedRevenueCents += amount
        continue
      }

      const { usdCents, rateUsed } = convertToUsdCents(
        amount,
        currencyCode,
        rates,
      )

      if (rateUsed === null) {
        continue
      }

      totalVerifiedRevenueCents += usdCents
    }

    const totalVerifiedRevenueCurrency =
      totalVerifiedRevenueCents > 0 ? "USD" : null

    return {
      profile,
      leaderboardPosition,
      productsPage,
      totalProducts,
      totalUpvotes,
      totalVerifiedRevenueCents,
      totalVerifiedRevenueCurrency,
      rewardPoints: rewardBalance?.balance ?? 0,
      verifiedCount,
      categories: categoryEntries,
      focusCategories,
      extraCategoryCount,
      badges: {
        showcase: badgeShowcase,
        overflow: badgeOverflow,
      },
      earliestLaunch,
    }
  },
  "users:profile:payload",
  {
    ttl: DEFAULT_TTL.medium,
    keyParts: ([id]) => [id],
    tags: ([id]) => [TAGS.users, TAGS.user(id), TAGS.products],
  },
)
