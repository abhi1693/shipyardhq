import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
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
        analytics: {
          select: {
            upvotes: true
          }
        }
        verification: true
        category: true
        user: true
        ProductBadge: true
        paymentConnector: {
          select: {
            latestAllTimeRevenueCents: true
            latestCurrencyCode: true
            revenueHistory: {
              orderBy: { periodStart: "desc" }
              take: 1
              select: {
                allTimeRevenueCents: true
                currencyCode: true
              }
            }
          }
        }
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
            analytics: {
              select: {
                upvotes: true,
              },
            },
            verification: true,
            category: true,
            user: true,
            ProductBadge: true,
            paymentConnector: {
              select: {
                latestAllTimeRevenueCents: true,
                latestCurrencyCode: true,
                revenueHistory: {
                  orderBy: { periodStart: "desc" },
                  take: 1,
                  select: {
                    allTimeRevenueCents: true,
                    currencyCode: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<PublicUserProfile | null>,
  "user:public-profile",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([id]) => [TAGS.users, TAGS.products, TAGS.user(String(id))],
  },
)
