"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
  invalidateActiveUserCache,
} from "@/lib/server/userStatus"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { revalidateUser } from "@/lib/cache/revalidate"

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth()
  if (!userId) return { error: "Not authenticated" }

  const roleIntent = formData.get("roleIntent")?.toString()
  const heardFrom = formData.get("heardFrom")?.toString()
  try {
    const clerkUser = await getClerkUserByIdCached(userId)

    // 1. Get the local user by Clerk ID
    let user = await getActiveUserByClerkId(userId)

    if (!user) {
      await syncUserFromClerk(clerkUser)
      user = await getActiveUserByClerkId(userId)
    }

    if (!user) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    // 2. Update user data only once; skip downstream work if already onboarded
    const onboardingUpdate = await prisma.user.updateMany({
      where: {
        id: user.id,
        onboardedAt: null,
      },
      data: {
        roleIntent,
        heardFrom,
        onboardedAt: new Date(),
      },
    })

    const firstTimeOnboarding = onboardingUpdate.count > 0

    if (!firstTimeOnboarding) {
      console.info(
        "Duplicate onboarding submission detected; skipping side effects.",
      )
    }

    if (firstTimeOnboarding) {
      await invalidateActiveUserCache(userId)
      revalidateUser(user.id)
    }

    return { success: true }
  } catch (error) {
    console.error("Onboarding failed:", error)
    return { error: "Failed to complete onboarding." }
  }
}
