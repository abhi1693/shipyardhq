import prisma from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/features"
import { PlanType } from "@/lib/vendor/prisma/client"

/**
 * Determines whether an organization has access to advanced analytics.
 * Access is granted when any connected product is on a plan that includes
 * the `analytics.advanced` feature or when the organization owner holds a
 * recurring plan that bundles both `organization` and `analytics.advanced`.
 */
export async function organizationHasAdvancedAnalytics(
  organizationId: string,
): Promise<boolean> {
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

    if (productWithAdvanced?.plan) {
      if (hasPlanFeature(productWithAdvanced.plan, "analytics.advanced")) {
        return true
      }
    }

    const ownerId = organization?.ownerUserId
    if (!ownerId) {
      return false
    }

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

    return Boolean(qualifyingPurchase)
  } catch (error) {
    console.error(
      "[organizationHasAdvancedAnalytics] access check failed",
      error,
    )
    return false
  }
}
