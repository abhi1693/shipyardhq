import type { Prisma } from "@/lib/vendor/prisma/client"

import prisma from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/features"
import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
  invalidateCacheByPrefix,
} from "@/lib/server/cache"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"
import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"
import { resolveEffectivePlanGrant } from "@/lib/products/effective-plan-grants"

const analyticsPlanSelect = {
  name: true,
  price: true,
  isDefault: true,
  assignments: {
    select: {
      enabled: true,
      feature: { select: { key: true } },
    },
  },
} satisfies Prisma.PlanSelect

const productAnalyticsSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  analytics: { select: { upvotes: true } },
  planGrants: {
    select: {
      id: true,
      source: true,
      startsAt: true,
      expiresAt: true,
      createdAt: true,
      plan: { select: analyticsPlanSelect },
    },
  },
} satisfies Prisma.ProductSelect

type RawProductAnalyticsRecord = Prisma.ProductGetPayload<{
  select: typeof productAnalyticsSelect
}>
type AnalyticsPlan = Prisma.PlanGetPayload<{
  select: typeof analyticsPlanSelect
}>

export type ProductAnalyticsRecord = Omit<
  RawProductAnalyticsRecord,
  "planGrants"
> & {
  plan: AnalyticsPlan | null
}

export async function getProductAnalyticsRecord(id: string) {
  const cacheKey = buildCacheKey("analytics", "productAnalytics", "v3", id)
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

  const now = new Date()
  const rawRecord = await prisma.product.findUnique({
    where: { id },
    select: {
      ...productAnalyticsSelect,
      planGrants: {
        ...productAnalyticsSelect.planGrants,
        where: {
          status: "active",
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    },
  })

  let record: ProductAnalyticsRecord | null = null
  let recordTtlSeconds = cacheTtlSeconds
  if (rawRecord) {
    const { planGrants, ...recordWithoutGrants } = rawRecord
    const effectiveGrant = resolveEffectivePlanGrant(planGrants)
    const defaultPlan = effectiveGrant
      ? null
      : await getDefaultPlanWithFeatures()
    record = {
      ...recordWithoutGrants,
      plan: effectiveGrant?.plan ?? defaultPlan ?? null,
    }
    if (effectiveGrant?.expiresAt) {
      const secondsUntilExpiry = Math.max(
        1,
        Math.ceil((effectiveGrant.expiresAt.getTime() - now.getTime()) / 1000),
      )
      recordTtlSeconds = Math.min(recordTtlSeconds, secondsUntilExpiry)
    }
  }

  if (record) {
    await cacheMiss({
      key: cacheKey,
      value: record,
      ttlSeconds: recordTtlSeconds,
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

export async function invalidateProductAnalyticsRecordCache(
  productId: string,
  reason = "manual",
) {
  return invalidateCacheByPrefix({
    keyPrefix: buildCacheKey("analytics", "productAnalytics", "v3", productId),
    onError: (error) => {
      console.error(
        "[analytics] failed to invalidate product analytics cache",
        {
          productId,
          reason,
          error,
        },
      )
    },
  })
}

export function resolveProductAnalyticsAccess(
  product: Pick<ProductAnalyticsRecord, "plan"> & {
    plan?: ProductAnalyticsRecord["plan"] | null
  },
) {
  const hasAdvancedAnalytics = hasPlanFeature(
    product.plan ?? null,
    "analytics.advanced",
  )

  const hasBasicAnalytics =
    hasAdvancedAnalytics ||
    hasPlanFeature(product.plan ?? null, "analytics.basic")

  return { hasAdvancedAnalytics, hasBasicAnalytics }
}
