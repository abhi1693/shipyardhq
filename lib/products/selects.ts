import { Prisma } from "@/lib/vendor/prisma/client"
import type { ProductCardBase } from "@/components/molecules/ProductCard"

const PRIORITY_PLACEMENT_FEATURE_KEY = "priorityPlacement"

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  logo: true,
  tagline: true,
  pricingModel: true,
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
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  plan: {
    select: {
      assignments: {
        where: { enabled: true },
        select: {
          feature: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

export type ProductCardSelect = typeof productCardSelect

export type ProductCardRecord = Prisma.ProductGetPayload<{
  select: ProductCardSelect
}>

const isPriorityPlacement = (product: ProductCardRecord): boolean =>
  product.plan?.assignments?.some(
    (assignment) => assignment.feature?.key === PRIORITY_PLACEMENT_FEATURE_KEY,
  ) ?? false

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
  options?: { scoreByProductId?: Map<string, number> },
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
    pricingModel: product.pricingModel,
    startingPriceCents: product.startingPriceCents,
    currencyCode: product.currencyCode,
    analytics: product.analytics,
    category: product.category,
    badges: resolveBadges(product, now),
    sponsored: isPriorityPlacement(product),
    isVerified: Boolean(product.verification?.isVerified),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    scoreCount,
  }
}

export const PRIORITY_FEATURE_KEY = PRIORITY_PLACEMENT_FEATURE_KEY
