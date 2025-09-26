import prisma from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/features"
import { PlanType } from "@/lib/vendor/prisma/client"
import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"

/**
 * Determines whether an organization has access to advanced analytics.
 * Access is granted when any connected product is on a plan that includes
 * the `analytics.advanced` feature or when the organization owner holds a
 * recurring plan that bundles both `organization` and `analytics.advanced`.
 */
export async function organizationHasAdvancedAnalytics(
  organizationId: string,
): Promise<boolean> {
  const cacheKey = buildCacheKey(
    "analytics",
    "organizationAccess",
    organizationId,
  )
  const cacheTtlSeconds = resolveCacheTtl("fast")

  const cachedResult = await cacheHit<boolean>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read organization access cache", {
        organizationId,
        cacheKey,
        error,
      })
    },
  })

  if (typeof cachedResult === "boolean") {
    return cachedResult
  }

  try {
    const [productWithAdvanced, organization] = await Promise.all([
      prisma.product.findFirst({
        where: {
          organizationId,
          plan: {
            assignments: {
              some: {
                enabled: true,
                feature: { key: "analytics.advanced" },
              },
            },
          },
        },
        select: {
          id: true,
          plan: {
            select: {
              assignments: {
                select: {
                  enabled: true,
                  feature: { select: { key: true } },
                },
              },
            },
          },
        },
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { ownerUserId: true },
      }),
    ])

    let hasAccess = false

    if (
      productWithAdvanced?.plan &&
      hasPlanFeature(productWithAdvanced.plan, "analytics.advanced")
    ) {
      hasAccess = true
    } else {
      const ownerId = organization?.ownerUserId
      if (ownerId) {
        const qualifyingPurchase = await prisma.userPlanPurchase.findFirst({
          where: {
            userId: ownerId,
            plan: {
              type: PlanType.recurring_price,
              AND: [
                {
                  assignments: {
                    some: {
                      enabled: true,
                      feature: { key: "organization" },
                    },
                  },
                },
                {
                  assignments: {
                    some: {
                      enabled: true,
                      feature: { key: "analytics.advanced" },
                    },
                  },
                },
              ],
            },
          },
          select: { id: true },
        })

        hasAccess = Boolean(qualifyingPurchase)
      }
    }

    await cacheMiss({
      key: cacheKey,
      value: hasAccess,
      ttlSeconds: cacheTtlSeconds,
      onError: (error) => {
        console.error("[analytics] failed to cache organization access", {
          organizationId,
          cacheKey,
          error,
        })
      },
    })

    return hasAccess
  } catch (error) {
    console.error(
      "[organizationHasAdvancedAnalytics] access check failed",
      error,
    )
    return false
  }
}
