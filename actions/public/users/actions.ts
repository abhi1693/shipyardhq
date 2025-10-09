import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_TTL,
  DEFAULT_SWR,
  TAGS,
} from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"

type PublicUserProfile = Prisma.UserGetPayload<{
  select: {
    id: true
    clerkId: true
    firstName: true
    lastName: true
    products: {
      where: { status: "published" }
      orderBy: { createdAt: "desc" }
      include: {
        analytics: true
        verification: true
        category: true
        user: true
        ProductBadge: true
      }
    }
  }
}>

export const getPublicUsersWithCounts = cached(
  async (limit = 48) =>
    prisma.user.findMany({
      where: { products: { some: { status: "published" as any } } },
      select: {
        id: true,
        clerkId: true,
        firstName: true,
        lastName: true,
        products: {
          where: { status: "published" as any },
          select: { id: true },
        },
      },
      orderBy: { products: { _count: "desc" } },
      take: limit,
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: accelerateTags([TAGS.users, TAGS.products]),
      },
    }),
  "users:with-product-counts",
  { ttl: DEFAULT_TTL.slow, tags: () => [TAGS.users, TAGS.products] },
)

export const getPublicUserMeta = cached(
  async (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        firstName: true,
        lastName: true,
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([TAGS.users, TAGS.user(String(id))]),
      },
    }),
  "user:public-meta",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.users, TAGS.user(String(id))],
  },
)

export const getPublicUserProfile = cached(
  async (id: string): Promise<PublicUserProfile | null> =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clerkId: true,
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.users,
          TAGS.products,
          TAGS.user(String(id)),
        ]),
      },
    }) as Promise<PublicUserProfile | null>,
  "user:public-profile",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.users, TAGS.products, TAGS.user(String(id))],
  },
)
