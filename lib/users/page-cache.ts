import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  getPublicUserProfile,
  getUserProductsPage,
  type UserProductsPageResult,
} from "@/actions/public/users/actions"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  buildPublicDiscoveryProductWhere,
  buildPublicDiscoverySqlFilter,
} from "@/lib/products/public-discovery"

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
  productsPage: UserProductsPageResult
  totalProducts: number
  totalUpvotes: number
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

    const publishedProductWhere: Prisma.ProductWhereInput =
      buildPublicDiscoveryProductWhere({
        userId: profile.id,
      })

    const [
      upvoteAggregate,
      verifiedCount,
      categoryCounts,
      activeBadges,
      earliestLaunchRow,
      productsPage,
    ] = await Promise.all([
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
        SELECT MIN(COALESCE(p."publishedAt", p."createdAt")) as "earliest"
        FROM "Product" AS p
        WHERE p."userId" = ${profile.id}
          AND p."status" = 'published'
          ${buildPublicDiscoverySqlFilter("p")}
      `,
      getUserProductsPage({ userId: profile.id }),
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

    return {
      profile,
      productsPage,
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
