import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

export const getPublicUsersWithCounts = cached(
  async (limit = 48) =>
    prisma.user.findMany({
      where: { products: { some: { status: "published" as any } } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        products: {
          where: { status: "published" as any },
          select: { id: true },
        },
      },
      orderBy: { products: { _count: "desc" } },
      take: limit,
    }),
  "users:with-product-counts",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.users, TAGS.products] },
)

export const getPublicUserProfile = cached(
  async (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        products: {
          where: { status: "published" as any },
          orderBy: { createdAt: "desc" },
          include: {
            analytics: true,
            verification: true,
            category: true,
            user: true,
            ProductBadge: true,
          },
        },
      },
    }),
  "user:public-profile",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.users, TAGS.products, TAGS.user(String(id))],
  },
)
