import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

type ListParams = Record<string, string | string[] | undefined>

export async function getUserProducts(params?: ListParams) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) throw new Error("User not found")

  const verification = (params?.verification as string) || undefined
  const status = (params?.status as string) || undefined
  const page = Math.max(1, parseInt((params?.page as string) || "1", 10) || 1)
  const limit = Math.max(1, parseInt((params?.limit as string) || "10", 10) || 10)
  const skip = (page - 1) * limit

  const where: any = { userId: user.id }

  if (verification === "verified") {
    where.verification = { isVerified: true }
  } else if (verification === "unverified") {
    where.verification = { isVerified: false }
  }

  if (status) {
    where.status = status
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        verification: { select: { isVerified: true } },
        analytics: { select: { clicks: true, upvotes: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, page, limit }
}
