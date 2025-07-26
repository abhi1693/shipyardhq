import prisma from "@/lib/prisma"
import { subDays } from "date-fns"

export async function getRecentProducts(limit = 10) {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  })
}

export async function getRecentUsers(limit = 10) {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      createdAt: true,
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
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { verification: { isVerified: true } } }),
    prisma.user.count(),
    prisma.plan.count(),
    prisma.product.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
  ])

  const unverifiedProducts = totalProducts - verifiedProducts
  const verifiedRate =
    totalProducts > 0 ? Math.round((verifiedProducts / totalProducts) * 100) : 0

  return {
    totalProducts,
    verifiedProducts,
    unverifiedProducts,
    totalUsers,
    totalPlans,
    productsLast7Days: newProductsThisWeek,
    usersLast7Days: newUsersThisWeek,
    verifiedRate,
  }
}
