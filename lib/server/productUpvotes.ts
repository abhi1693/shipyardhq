import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"

const recentUpvoterSelection = {
  id: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const satisfies Prisma.ProductUpvoteSelect

type RecentUpvoterRow = Prisma.ProductUpvoteGetPayload<{
  select: typeof recentUpvoterSelection
}>

export type ProductUpvoterSummary = {
  id: string
  createdAt: Date
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
  }
}

export async function getRecentProductUpvoters(
  productId: string,
  limit = 8,
): Promise<ProductUpvoterSummary[]> {
  if (!productId) return []
  const rows: RecentUpvoterRow[] = await prisma.productUpvote.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: Math.max(0, limit),
    select: recentUpvoterSelection,
  })

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    user: {
      id: row.user.id,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      email: row.user.email,
    },
  }))
}
