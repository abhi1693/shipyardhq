import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import type { PlanFeatureKey } from "@/lib/constants"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

// Check if the current member has access to a feature via any paid plan
export async function memberHasFeature(key: PlanFeatureKey): Promise<boolean> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return false

    const user = await getActiveUserByClerkId(clerkId)
    if (!user) return false

    // 1) Any owned product whose plan grants this feature
    const ownedProductWithFeature = await prisma.product.findFirst({
      where: {
        userId: user.id,
        OR: [
          {
            plan: {
              assignments: {
                some: { enabled: true, feature: { key } },
              },
            },
          },
          {
            featureEntitlements: {
              some: {
                featureKey: key,
                status: { in: ["active", "pending"] },
              },
            },
          },
        ],
      },
      select: { id: true },
    })

    if (ownedProductWithFeature) return true

    // 2) Any plan the user has purchased that grants this feature
    const userPurchaseWithFeature = await prisma.userPlanPurchase.findFirst({
      where: {
        userId: user.id,
        plan: {
          assignments: {
            some: { enabled: true, feature: { key } },
          },
        },
      },
      select: { id: true },
    })

    if (userPurchaseWithFeature) return true

    const directEntitlement = await prisma.featureEntitlement.findFirst({
      where: {
        userId: user.id,
        featureKey: key,
        status: { in: ["active", "pending"] },
      },
      select: { id: true },
    })

    if (directEntitlement) return true

    return false
  } catch {
    return false
  }
}

export async function requireMemberFeature(
  key: PlanFeatureKey,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ok = await memberHasFeature(key)
  if (!ok)
    return {
      ok: false,
      reason: `Missing required feature: ${key}`,
    }
  return { ok: true }
}
