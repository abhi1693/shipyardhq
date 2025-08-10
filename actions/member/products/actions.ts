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
  const q = ((params?.q as string) || "").trim()
  const sort = (params?.sort as string) || "new"
  const page = Math.max(1, parseInt((params?.page as string) || "1", 10) || 1)
  const limit = Math.max(
    1,
    parseInt((params?.limit as string) || "10", 10) || 10,
  )
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

  if (q.length) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ]
  }

  let orderBy: any = { createdAt: "desc" as const }
  switch (sort) {
    case "updated":
      orderBy = { updatedAt: "desc" }
      break
    case "az":
      orderBy = { name: "asc" }
      break
    case "clicks":
      orderBy = { analytics: { clicks: "desc" } }
      break
    case "upvotes":
      orderBy = { analytics: { upvotes: "desc" } }
      break
    case "new":
    default:
      orderBy = { createdAt: "desc" }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
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
