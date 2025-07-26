import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function getUserDashboardStats() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const [products, productsLast7Days] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id },
      include: {
        verification: { select: { isVerified: true } },
        analytics: { select: { views: true, upvotes: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
    }),
    prisma.product.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ])

  const totalProducts = products.length
  const verifiedDomains = products.filter(
    (p) => p.verification?.isVerified,
  ).length

  const totalViews = products.reduce(
    (sum, p) => sum + (p.analytics?.views || 0),
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
    productsLast7Days,
    verifiedDomains,
    verifiedRate,
    totalViews,
    totalUpvotes,
    plan,
  }
}

export async function getUserProducts(limit = 10) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  return prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      plan: { select: { name: true } },
      verification: { select: { isVerified: true } },
      analytics: { select: { views: true, upvotes: true } },
    },
  })
}
