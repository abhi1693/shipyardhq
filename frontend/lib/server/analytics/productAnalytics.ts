import type { Prisma } from "@/lib/vendor/prisma/client"

import prisma from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/features"
import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"
import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"

export const productAnalyticsSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  analytics: { select: { upvotes: true } },
  plan: {
    select: {
      name: true,
      price: true,
      isDefault: true,
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
  featureEntitlements: {
    where: {
      status: {
        in: ["active", "pending"],
      },
    },
    select: {
      featureKey: true,
      status: true,
    },
  },
} satisfies Prisma.ProductSelect

export type ProductAnalyticsRecord = Prisma.ProductGetPayload<{
  select: typeof productAnalyticsSelect
}>

export async function getProductAnalyticsRecord(id: string) {
  // v2 to bust older cache entries that lacked plan defaults
  const cacheKey = buildCacheKey("analytics", "productAnalytics", "v2", id)
  const cacheTtlSeconds = resolveCacheTtl("fast")

  const cachedRecord = await cacheHit<ProductAnalyticsRecord | null>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read product analytics cache", {
        productId: id,
        cacheKey,
        error,
      })
    },
  })

  if (cachedRecord) {
    return cachedRecord
  }

  let record = await prisma.product.findUnique({
    where: { id },
    select: productAnalyticsSelect,
  })

  if (record && !record.plan) {
    const defaultPlan = await getDefaultPlanWithFeatures()
    if (defaultPlan) {
      record = { ...record, plan: defaultPlan }
    }
  }

  if (record) {
    await cacheMiss({
      key: cacheKey,
      value: record,
      ttlSeconds: cacheTtlSeconds,
      onError: (error) => {
        console.error("[analytics] failed to cache product analytics", {
          productId: id,
          cacheKey,
          error,
        })
      },
    })
  }

  return record
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

export function resolveProductAnalyticsAccess(
  product: Pick<ProductAnalyticsRecord, "plan" | "featureEntitlements"> & {
    plan?: ProductAnalyticsRecord["plan"] | null
  },
) {
  const entitlementFeatures = new Set(
    (product.featureEntitlements ?? []).map((ent) => ent.featureKey),
  )

  const hasAdvancedAnalytics =
    hasPlanFeature(product.plan ?? null, "analytics.advanced") ||
    entitlementFeatures.has("analytics.advanced")

  const hasBasicAnalytics =
    hasAdvancedAnalytics ||
    hasPlanFeature(product.plan ?? null, "analytics.basic") ||
    entitlementFeatures.has("analytics.basic")

  return { hasAdvancedAnalytics, hasBasicAnalytics }
}
