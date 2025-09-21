import type { Prisma } from "@/lib/vendor/prisma/client"

import prisma from "@/lib/prisma"

export const productAnalyticsSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  analytics: { select: { upvotes: true, clicks: true } },
  plan: {
    select: {
      name: true,
      price: true,
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

export type ProductAnalyticsRecord = Prisma.ProductGetPayload<{
  select: typeof productAnalyticsSelect
}>

export async function getProductAnalyticsRecord(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: productAnalyticsSelect,
  })
}

export function toProductAnalyticsViewProduct(product: ProductAnalyticsRecord) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    analytics: product.analytics,
  }
}
