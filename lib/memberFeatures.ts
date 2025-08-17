import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import type { PlanFeatureKey } from "@/lib/constants"

// Check if the current member has access to a feature via any paid plan
export async function memberHasFeature(key: PlanFeatureKey): Promise<boolean> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return false

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!user) return false

    // 1) Any owned product whose plan grants this feature
    const ownedProductWithFeature = await prisma.product.findFirst({
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

    if (ownedProductWithFeature) return true

    // 2) Any organization the user belongs to whose org-level plan grants this feature
    const orgWithFeature = await prisma.organization.findFirst({
      where: {
        memberships: { some: { userId: user.id } },
        plan: {
          assignments: {
            some: { enabled: true, feature: { key } },
          },
        },
      },
      select: { id: true },
    })

    return !!orgWithFeature
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
