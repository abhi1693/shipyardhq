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
    const now = new Date()

    // 1) Any owned product whose plan grants this feature
    const ownedProductWithFeature = await prisma.product.findFirst({
      where: {
        userId: user.id,
        planGrants: {
          some: {
            status: "active",
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            plan: {
              assignments: {
                some: { enabled: true, feature: { key } },
              },
            },
          },
        },
      },
      select: { id: true },
    })

    if (ownedProductWithFeature) return true

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
