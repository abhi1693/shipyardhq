import prisma from "@/lib/prisma"

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
  const [totalProducts, verifiedProducts, totalUsers, totalPlans] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { verification: { isVerified: true } } }),
      prisma.user.count(),
      prisma.plan.count(),
    ])

  return {
    totalProducts,
    verifiedProducts,
    unverifiedProducts: totalProducts - verifiedProducts,
    totalUsers,
    totalPlans,
  }
}
