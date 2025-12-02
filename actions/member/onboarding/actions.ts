"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
  invalidateActiveUserCache,
} from "@/lib/server/userStatus"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import {
  LEADERBOARD_GUIDE_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_PATH,
  MEMBER_FEEDBACK_PATH,
  MEMBER_OVERVIEW_PATH,
  REWARDS_PATH,
} from "@/lib/routes"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { revalidateUser } from "@/lib/cache/revalidate"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  isNovuEnabled,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"

const BUILDER_INTENTS = new Set(["launch-product", "manage-team"])
const WELCOME_SUBJECT = "Welcome aboard ShipYardHQ"
const NOVU_WELCOME_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_WELCOME_USER?.trim() || "welcome-user"

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

    if (user.email && firstTimeOnboarding) {
      const isBuilderIntent = roleIntent
        ? BUILDER_INTENTS.has(roleIntent)
        : false

      if (!isNovuEnabled()) {
        console.info(
          "Skipping onboarding welcome workflow; Novu not configured.",
        )
      } else {
        try {
          const baseUrl = resolveSiteUrl()
          const subscriber = {
            subscriberId: userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: clerkUser.imageUrl ?? null,
          }
          const links = {
            dashboard: `${baseUrl}${MEMBER_OVERVIEW_PATH}`,
            leaderboard: `${baseUrl}${LEADERBOARD_PATH}`,
            monthly: `${baseUrl}${LEADERBOARD_MONTHLY_PATH}`,
            guide: `${baseUrl}${LEADERBOARD_GUIDE_PATH}`,
            feedback: `${baseUrl}${MEMBER_FEEDBACK_PATH}`,
            rewards: `${baseUrl}${REWARDS_PATH}`,
          }
          const payload = {
            notification: {
              kind: "welcome_user",
              subject: WELCOME_SUBJECT,
              message:
                "Welcome aboard—open your dashboard to start your ShipYardHQ workspace.",
              timestamp: new Date().toISOString(),
            },
            onboarding: {
              firstName: user.firstName ?? null,
              isBuilder: isBuilderIntent,
            },
            links,
            tags: ["welcome"],
          }

          await triggerNovuWorkflow({
            workflowId: NOVU_WELCOME_WORKFLOW_ID,
            subscriber,
            payload,
          })
        } catch (error) {
          console.error("Failed to trigger onboarding welcome workflow:", error)
        }
      }
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
