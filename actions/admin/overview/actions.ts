import prisma from "@/lib/prisma"
import { clerkClient } from "@clerk/nextjs/server"
import { addDays, startOfDay, subDays } from "date-fns"

export interface DashboardStats {
  totalProducts: number
  verifiedProducts: number
  unverifiedProducts: number
  totalUsers: number
  totalPlans: number
  productsInRange: number
  usersInRange: number
  productsDelta: number
  usersDelta: number
  verifiedRate: number
  adminCount: number
  memberCount: number
  defaultPlanProductCount: number
  mostPopularPlan: { name: string; id: string; count: number } | null
  totalRevenue: number
  totalFeatures: number
  usedFeatureAssignments: number
  featureCoverage: number
  dailyProducts: number[]
  dailyUsers: number[]
  totalViews: number
  viewsInRange: number
  previousViews: number
  viewsDelta: number
  totalClicks: number
  totalUpvotes: number
  upvotesInRange: number
  previousUpvotes: number
  upvotesDelta: number
}

export async function getRecentProducts(limit = 10, days?: number) {
  const where = days
    ? { createdAt: { gte: subDays(new Date(), days) } }
    : undefined
  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: true,
      plan: true,
      verification: true,
      category: true,
    },
  })
}

export async function getRecentUsers(limit = 10, days?: number) {
  const where = days
    ? { createdAt: { gte: subDays(new Date(), days) } }
    : undefined
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      products: true,
    },
  })
}

export async function getDashboardStats(days = 7): Promise<DashboardStats> {
  const now = new Date()
  const since = subDays(now, days)
  const prevSince = subDays(since, days)

  const [
    totalProducts,
    verifiedProducts,
    totalUsers,
    totalPlans,
    newProductsThisWeek,
    newUsersThisWeek,
    adminCount,
    mostPopularPlanAllTime,
    defaultPlanProductCount,
    totalFeatures,
    usedFeatures,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { verification: { isVerified: true } } }),
    prisma.user.count(),
    prisma.plan.count(),
    prisma.product.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { role: "admin" } }),

    prisma.plan.findFirst({
      orderBy: { products: { _count: "desc" } },
      include: { _count: { select: { products: true } } },
    }),

    prisma.product.count({
      where: {
        plan: {
          isDefault: true,
        },
      },
    }),

    prisma.planFeature.count(),

    prisma.planFeatureAssignment.aggregate({
      _count: true,
    }),
  ])

  // Build simple per-day counts for sparklines
  const dayStarts: Date[] = Array.from({ length: days }, (_, i) =>
    startOfDay(addDays(since, i + 1)),
  )
  const dayRanges = dayStarts.map((start) => ({
    start,
    end: addDays(start, 1),
  }))

  const [dailyProducts, dailyUsers] = await Promise.all([
    Promise.all(
      dayRanges.map(({ start, end }) =>
        prisma.product.count({ where: { createdAt: { gte: start, lt: end } } }),
      ),
    ),
    Promise.all(
      dayRanges.map(({ start, end }) =>
        prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
      ),
    ),
  ])

  // Determine most used plan within current range
  let mostPopularPlan: { id: string; name: string; count: number } | null = null
  const grouped = await prisma.product.groupBy({
    by: ["planId"],
    where: { createdAt: { gte: since }, planId: { not: null } },
    _count: { planId: true },
    orderBy: { _count: { planId: "desc" } },
    take: 1,
  })
  if (grouped.length > 0 && grouped[0].planId) {
    const top = grouped[0]
    const plan = await prisma.plan.findUnique({ where: { id: top.planId! } })
    if (plan) {
      mostPopularPlan = {
        id: plan.id,
        name: plan.name,
        count: top._count.planId,
      }
    }
  } else if (mostPopularPlanAllTime) {
    // Fallback to all-time if no products in range
    mostPopularPlan = {
      id: mostPopularPlanAllTime.id,
      name: mostPopularPlanAllTime.name,
      count: mostPopularPlanAllTime._count.products,
    }
  }

  const unverifiedProducts = totalProducts - verifiedProducts
  const verifiedRate =
    totalProducts > 0 ? Math.round((verifiedProducts / totalProducts) * 100) : 0
  const usedFeatureAssignments = usedFeatures._count ?? 0

  const [
    analyticsAggregate,
    viewsInRange,
    previousViews,
    totalViews,
    upvotesInRange,
    previousUpvotes,
  ] = await Promise.all([
    prisma.productAnalytics.aggregate({
      _sum: { clicks: true, upvotes: true },
    }),
    prisma.productTrafficEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.productTrafficEvent.count({
      where: { createdAt: { gte: prevSince, lt: since } },
    }),
    prisma.productTrafficEvent.count(),
    prisma.productUpvote.count({ where: { createdAt: { gte: since } } }),
    prisma.productUpvote.count({
      where: { createdAt: { gte: prevSince, lt: since } },
    }),
  ])

  const totalClicks = analyticsAggregate._sum.clicks ?? 0
  const totalUpvotes = analyticsAggregate._sum.upvotes ?? 0
  const viewsDelta = viewsInRange - previousViews
  const upvotesDelta = upvotesInRange - previousUpvotes

  // Fallback/supplement: derive admin count from Clerk public metadata
  let adminCountFromClerk = 0
  try {
    const ids = await prisma.user.findMany({ select: { clerkId: true } })
    const client = await clerkClient()
    const results = await Promise.all(
      ids.map(async (u) => {
        try {
          const user = await client.users.getUser(u.clerkId)
          const role = (user.publicMetadata as any)?.role
          return role === "admin" ? 1 : 0
        } catch {
          return 0
        }
      }),
    )
    adminCountFromClerk = results.reduce<number>((a, b) => a + b, 0)
  } catch {
    // ignore Clerk failures; rely on DB role
  }
  const effectiveAdminCount = Math.max(adminCount, adminCountFromClerk)
  const memberCount = totalUsers - effectiveAdminCount

  // Previous-period counts for deltas
  const [prevProducts, prevUsers] = await Promise.all([
    prisma.product.count({
      where: { createdAt: { gte: prevSince, lt: since } },
    }),
    prisma.user.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
  ])

  const productsDelta = newProductsThisWeek - prevProducts
  const usersDelta = newUsersThisWeek - prevUsers

  // Estimate revenue as sum of assigned plan prices across products
  const productsForRevenue = await prisma.product.findMany({
    select: { plan: { select: { price: true } } },
  })
  const estimatedRevenueCents = productsForRevenue.reduce((sum, p) => {
    return sum + (p.plan?.price ?? 0)
  }, 0)

  return {
    totalProducts,
    verifiedProducts,
    unverifiedProducts,
    totalUsers,
    totalPlans,
    productsInRange: newProductsThisWeek,
    usersInRange: newUsersThisWeek,
    productsDelta,
    usersDelta,
    verifiedRate,
    adminCount: effectiveAdminCount,
    memberCount,
    defaultPlanProductCount,
    mostPopularPlan: mostPopularPlan
      ? {
          name: mostPopularPlan.name,
          id: mostPopularPlan.id,
          count: mostPopularPlan.count,
        }
      : null,
    totalRevenue: estimatedRevenueCents,
    totalFeatures,
    usedFeatureAssignments,
    featureCoverage: totalFeatures
      ? Math.round((usedFeatureAssignments / totalFeatures) * 100)
      : 0,
    totalViews,
    viewsInRange,
    previousViews,
    viewsDelta,
    totalClicks,
    totalUpvotes,
    upvotesInRange,
    previousUpvotes,
    upvotesDelta,
    dailyProducts,
    dailyUsers,
  }
}
