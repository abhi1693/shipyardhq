import { Prisma } from "@/lib/vendor/prisma/client"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { resolveProductCategories } from "@/lib/products/categories"
import {
  hasActivePlacementGrant,
  PAID_PLACEMENT_GRANT_SOURCES,
} from "@/lib/products/placement-grants"

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  planId: true,
  type: true,
  pricingModel: true,
  platforms: true,
  keywords: true,
  startingPriceCents: true,
  currencyCode: true,
  createdAt: true,
  updatedAt: true,
  analytics: {
    select: {
      upvotes: true,
    },
  },
  verification: {
    select: {
      isVerified: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  categories: {
    orderBy: [{ createdAt: "asc" }, { categoryId: "asc" }],
    take: 3,
    select: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  planGrants: {
    where: {
      source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
      status: "active",
    },
    select: {
      planId: true,
      source: true,
      status: true,
      startsAt: true,
      expiresAt: true,
    },
  },
  alternatives: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductSelect

export type ProductCardSelect = typeof productCardSelect

export type ProductCardRecord = Prisma.ProductGetPayload<{
  select: ProductCardSelect
}>

type PriorityPlanIds = ReadonlySet<string> | readonly string[]

const resolveBadges = (
  product: ProductCardRecord,
  now: Date,
): string[] | undefined => {
  if (!product.ProductBadge?.length) return undefined
  const badges = product.ProductBadge.filter(
    (badge) => !badge.expiresAt || badge.expiresAt > now,
  ).map((badge) => badge.badge)
  return badges.length ? badges : undefined
}

export const mapProductCardRecordToBase = (
  product: ProductCardRecord,
  now: Date = new Date(),
  options?: {
    scoreByProductId?: Map<string, number>
    priorityPlanIds?: PriorityPlanIds
    placementNow?: Date
  },
): ProductCardBase => {
  const scoreOverride = options?.scoreByProductId?.get(product.id)
  const scoreCount =
    typeof scoreOverride === "number"
      ? scoreOverride
      : typeof (product as any).scoreCount === "number"
        ? (product as any).scoreCount
        : undefined

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline ?? "",
    type: product.type,
    pricingModel: product.pricingModel,
    platforms: product.platforms,
    keywords: product.keywords,
    startingPriceCents: product.startingPriceCents,
    currencyCode: product.currencyCode,
    analytics: product.analytics,
    category: product.category,
    categories: resolveProductCategories(product.category, product.categories),
    badges: resolveBadges(product, now),
    alternatives: product.alternatives,
    sponsored: options?.priorityPlanIds
      ? hasActivePlacementGrant(
          product,
          options.priorityPlanIds,
          options.placementNow ?? new Date(),
        )
      : false,
    isVerified: Boolean(product.verification?.isVerified),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    scoreCount,
  }
}
