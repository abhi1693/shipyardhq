import { Prisma } from "@/lib/vendor/prisma/client"

export const buildVerifiedRevenueWhere = (): Prisma.ProductWhereInput => ({
  paymentConnector: {
    is: {
      verifiedAt: { not: null },
      status: "active",
      OR: [
        { latestAllTimeRevenueCents: { gt: 0 } },
        {
          revenueHistory: {
            some: { allTimeRevenueCents: { gt: 0 } },
          },
        },
      ],
    },
  },
})

export const VERIFIED_REVENUE_ORDER_BY: Prisma.ProductOrderByWithRelationInput[] =
  [
    { paymentConnector: { latestAllTimeRevenueCents: "desc" } },
    { analytics: { upvotes: "desc" } },
    { createdAt: "desc" },
  ]

export const VERIFIED_REVENUE_PAGE_SIZE = 24
export const VERIFIED_REVENUE_MAX_PAGE_SIZE = 50
