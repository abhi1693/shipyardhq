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

export async function getProductActivity(
  productId: string,
  days = 30,
  limit = 20,
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const owner = await prisma.product.findFirst({
    where: { id: productId, user: { clerkId: userId } },
    select: { id: true, createdAt: true, updatedAt: true },
  })
  if (!owner) throw new Error("Not found")

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [verified, badges, upvotes] = await Promise.all([
    prisma.productVerification.findMany({
      where: { productId, verifiedAt: { not: null, gte: since } },
      select: { verifiedAt: true },
      orderBy: { verifiedAt: "desc" },
      take: limit,
    }),
    prisma.productBadge.findMany({
      where: { productId, createdAt: { gte: since } },
      select: { id: true, badge: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.productUpvote.findMany({
      where: { productId, createdAt: { gte: since } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ])

  type Activity =
    | { type: "product_created"; ts: Date }
    | { type: "product_updated"; ts: Date }
    | { type: "domain_verified"; ts: Date }
    | { type: "badge_assigned"; ts: Date; meta: { badge: string } }
    | { type: "product_upvoted"; ts: Date }

  const list: Activity[] = []
  list.push({ type: "product_created", ts: owner.createdAt as any })
  list.push({ type: "product_updated", ts: owner.updatedAt as any })
  verified.forEach((v) =>
    list.push({ type: "domain_verified", ts: v.verifiedAt as Date }),
  )
  badges.forEach((b) =>
    list.push({ type: "badge_assigned", ts: b.createdAt, meta: { badge: b.badge } }),
  )
  upvotes.forEach((u) => list.push({ type: "product_upvoted", ts: u.createdAt }))

  list.sort((a, b) => b.ts.getTime() - a.ts.getTime())
  return list.slice(0, limit)
}

export async function getRecentUpvoters(productId: string, limit = 5) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const ok = await prisma.product.findFirst({
    where: { id: productId, user: { clerkId: userId } },
    select: { id: true },
  })
  if (!ok) throw new Error("Not found")
  const rows = await prisma.productUpvote.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  })
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    user: {
      id: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      email: r.user.email,
    },
  }))
}
