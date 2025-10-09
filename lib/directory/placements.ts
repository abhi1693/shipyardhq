import type { FeaturedProduct } from "@/types"

export type PlacementOrigin = "schedule" | "plan" | "entitlement" | null

export interface PlacementResolution {
  isSponsored: boolean
  origin: PlacementOrigin
  schedule?: {
    startsAt: Date
    endsAt: Date
    featureKey: string
  }
}

const FEATURE_KEYS = {
  featured: "featured",
  homepage: "homepage",
} as const

type SupportedFeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

const nowWithin = (date?: { startsAt: Date; endsAt: Date }) => {
  if (!date) return false
  const now = Date.now()
  return date.startsAt.getTime() <= now && date.endsAt.getTime() >= now
}

export function resolveSponsoredPlacement(
  entry: FeaturedProduct,
  featureKey: SupportedFeatureKey,
): PlacementResolution {
  const schedules = entry.product.placementSchedules ?? []
  const schedule = schedules.find(
    (placement) =>
      placement.featureKey === featureKey &&
      nowWithin({ startsAt: placement.startsAt, endsAt: placement.endsAt }),
  )

  if (schedule) {
    return {
      isSponsored: true,
      origin: "schedule",
      schedule: {
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        featureKey: schedule.featureKey,
      },
    }
  }

  const planAssignments = entry.product.plan?.assignments ?? []
  const hasPlan = planAssignments.some(
    (assignment) => assignment.feature?.key === featureKey,
  )
  if (hasPlan) {
    return { isSponsored: true, origin: "plan" }
  }

  const entitlements = entry.product.featureEntitlements ?? []
  const hasEntitlement = entitlements.some(
    (entitlement) => entitlement.featureKey === featureKey,
  )
  if (hasEntitlement) {
    return { isSponsored: true, origin: "entitlement" }
  }

  return { isSponsored: false, origin: null }
}

export function partitionFeaturedProducts(products: FeaturedProduct[]): {
  sponsored: FeaturedProduct[]
  organic: FeaturedProduct[]
} {
  const sponsored: FeaturedProduct[] = []
  const organic: FeaturedProduct[] = []

  for (const product of products) {
    const placement = resolveSponsoredPlacement(product, FEATURE_KEYS.featured)
    if (placement.isSponsored) {
      sponsored.push(product)
    } else {
      organic.push(product)
    }
  }

  return { sponsored, organic }
}
