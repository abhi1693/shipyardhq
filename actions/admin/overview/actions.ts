import prisma from "@/lib/prisma"
import { subDays } from "date-fns"

export async function getRecentProducts(limit = 10) {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: true,
      plan: true,
      verification: true,
    },
  })
}

export async function getRecentUsers(limit = 10) {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      products: true,
    },
  })
}

export async function getDashboardStats() {
  const now = new Date()
  const last7Days = subDays(now, 7)

  const [
    totalProducts,
    verifiedProducts,
    totalUsers,
    totalPlans,
    newProductsThisWeek,
    newUsersThisWeek,
    adminCount,
    mostPopularPlan,
    defaultPlanProductCount,
    totalRevenue,
    totalFeatures,
    usedFeatures,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { verification: { isVerified: true } } }),
    prisma.user.count(),
    prisma.plan.count(),
    prisma.product.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
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

    prisma.plan.aggregate({
      _sum: { price: true },
    }),

    prisma.planFeature.count(),

    prisma.planFeatureAssignment.aggregate({
      _count: true,
    }),
  ])

  const unverifiedProducts = totalProducts - verifiedProducts
  const verifiedRate =
    totalProducts > 0 ? Math.round((verifiedProducts / totalProducts) * 100) : 0
  const memberCount = totalUsers - adminCount

  return {
    totalProducts,
    verifiedProducts,
    unverifiedProducts,
    totalUsers,
    totalPlans,
    productsLast7Days: newProductsThisWeek,
    usersLast7Days: newUsersThisWeek,
    verifiedRate,
    adminCount,
    memberCount,
    defaultPlanProductCount,
    mostPopularPlan: mostPopularPlan
      ? {
          name: mostPopularPlan.name,
          id: mostPopularPlan.id,
          count: mostPopularPlan._count.products,
        }
      : null,
    totalRevenue: totalRevenue._sum.price ?? 0,
    featureCoverage: totalFeatures
      ? Math.round((usedFeatures._count / totalFeatures) * 100)
      : 0,
  }
}
