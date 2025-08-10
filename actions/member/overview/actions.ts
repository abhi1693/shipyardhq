import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { subDays } from "date-fns"

export async function getUserDashboardStats(days = 7) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const since = subDays(new Date(), days)

  const [products, productsInRange, draftsCount, unverifiedCount] =
    await Promise.all([
      prisma.product.findMany({
        where: { userId: user.id },
        include: {
          verification: { select: { isVerified: true } },
          analytics: { select: { clicks: true, upvotes: true } },
          plan: { select: { id: true, name: true, price: true } },
        },
      }),
      prisma.product.count({
        where: {
          userId: user.id,
          createdAt: { gte: since },
        },
      }),
      prisma.product.count({ where: { userId: user.id, status: "draft" } }),
      prisma.product.count({
        where: { userId: user.id, verification: { isVerified: false } },
      }),
    ])

  const totalProducts = products.length
  const verifiedDomains = products.filter(
    (p) => p.verification?.isVerified,
  ).length

  const totalClicks = products.reduce(
    (sum, p) => sum + (p.analytics?.clicks || 0),
    0,
  )

  const totalUpvotes = products.reduce(
    (sum, p) => sum + (p.analytics?.upvotes || 0),
    0,
  )

  const verifiedRate =
    totalProducts > 0 ? Math.round((verifiedDomains / totalProducts) * 100) : 0

  // Extract latest plan from the most recent product
  const latestProduct = products[0]
  const plan = latestProduct?.plan ?? null

  return {
    totalProducts,
    productsInRange,
    draftsCount,
    unverifiedCount,
    verifiedDomains,
    verifiedRate,
    totalClicks,
    totalUpvotes,
    plan,
  }
}

export async function getUserProducts(limit = 10, days?: number) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const where: any = { userId: user.id }
  if (days) {
    where.createdAt = { gte: subDays(new Date(), days) }
  }

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      plan: { select: { name: true } },
      verification: { select: { isVerified: true } },
      analytics: { select: { clicks: true, upvotes: true } },
    },
  })
}
