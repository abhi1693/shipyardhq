import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  buildActivePlacementPlanFilter,
  buildRegularPlacementPlanFilter,
} from "@/lib/products/placement-grants"

export {
  buildActivePlacementPlanFilter,
  hasActivePlacementGrant,
} from "@/lib/products/placement-grants"
export type {
  ProductPlacementGrant,
  ProductPlacementGrantRecord,
} from "@/lib/products/placement-grants"

export const PRIORITY_FEATURE_KEY = "priorityPlacement" as const
export const SPONSORED_PRODUCTS_FEATURE_KEY = "sponsoredProducts" as const
export const PARTNER_SPOTLIGHT_FEATURE_KEY = "partnerSpotlight" as const

export const SPONSORED_PLACEMENT_FEATURE_KEYS = [
  PRIORITY_FEATURE_KEY,
  SPONSORED_PRODUCTS_FEATURE_KEY,
] as const

async function getEnabledPlanIdsForFeatureKeys(featureKeys: readonly string[]) {
  const assignments = await prisma.planFeatureAssignment.findMany({
    where: {
      enabled: true,
      feature: { key: { in: [...featureKeys] } },
    },
    select: { planId: true },
  })

  return Array.from(new Set(assignments.map((assignment) => assignment.planId)))
}

export async function getPriorityPlacementPlanIds() {
  "use cache"
  applyCache(
    [
      "products:priority-placement-plan-ids",
      TAGS.plans,
      TAGS.planFeature(PRIORITY_FEATURE_KEY),
    ],
    DEFAULT_TTL.slow,
  )

  return getEnabledPlanIdsForFeatureKeys([PRIORITY_FEATURE_KEY])
}

export async function getSponsoredPlacementPlanIds() {
  "use cache"
  applyCache(
    [
      "products:sponsored-placement-plan-ids",
      TAGS.plans,
      ...SPONSORED_PLACEMENT_FEATURE_KEYS.map((key) => TAGS.planFeature(key)),
    ],
    DEFAULT_TTL.slow,
  )

  return getEnabledPlanIdsForFeatureKeys(SPONSORED_PLACEMENT_FEATURE_KEYS)
}

export async function getSponsoredProductsPlanIds() {
  "use cache"
  applyCache(
    [
      "products:sponsored-products-plan-ids",
      TAGS.plans,
      TAGS.planFeature(SPONSORED_PRODUCTS_FEATURE_KEY),
    ],
    DEFAULT_TTL.slow,
  )

  return getEnabledPlanIdsForFeatureKeys([SPONSORED_PRODUCTS_FEATURE_KEY])
}

export async function getPartnerSpotlightPlanIds() {
  "use cache"
  applyCache(
    [
      "products:partner-spotlight-plan-ids",
      TAGS.plans,
      TAGS.planFeature(PARTNER_SPOTLIGHT_FEATURE_KEY),
    ],
    DEFAULT_TTL.slow,
  )

  return getEnabledPlanIdsForFeatureKeys([PARTNER_SPOTLIGHT_FEATURE_KEY])
}

export function buildPriorityPlanFilter(
  priorityPlanIds: string[],
  now: Date,
): Prisma.ProductWhereInput {
  return buildActivePlacementPlanFilter(priorityPlanIds, now)
}

export function buildRegularPlanFilter(
  priorityPlanIds: string[],
  now: Date,
): Prisma.ProductWhereInput {
  return buildRegularPlacementPlanFilter(priorityPlanIds, now)
}
