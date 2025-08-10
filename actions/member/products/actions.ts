import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function getUserProducts() {
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
    include: {
      verification: { select: { isVerified: true } },
      analytics: { select: { clicks: true, upvotes: true } },
    },
  })
}
