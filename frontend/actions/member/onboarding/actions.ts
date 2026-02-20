"use server"

import { auth } from "@clerk/nextjs/server"
import {
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
import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"
import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"

const BUILDER_INTENTS = new Set(["launch-product", "manage-team"])
const WELCOME_SUBJECT = `Welcome to ${siteConfig.name}`
const NOVU_WELCOME_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_WELCOME_USER?.trim() || "welcome-user"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type MemberOnboardingCompletePayload = {
  firstTimeOnboarding: boolean
  user: {
    id: string
    email: string | null
    firstName: string | null
    lastName: string | null
  }
}

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) return null
  return authResult.getToken().catch(() => null)
}

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth()
  if (!userId) return { error: "Not authenticated" }

  const roleIntent = formData.get("roleIntent")?.toString()
  const heardFrom = formData.get("heardFrom")?.toString()
  try {
    const clerkUser = await getClerkUserByIdCached(userId)
    const authToken = await getAuthToken()
    if (!authToken) {
      return { error: "Not authenticated" }
    }

    await syncUserFromClerk(clerkUser)

    const response =
      await fastapiFetch<ApiResponse<MemberOnboardingCompletePayload>>(
        "/api/v1/member/onboarding/complete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleIntent: roleIntent ?? null,
            heardFrom: heardFrom ?? null,
            email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
            firstName: clerkUser.firstName ?? null,
            lastName: clerkUser.lastName ?? null,
          }),
        },
      )

    if (response.status !== 200 || !response.data) {
      return { error: "Failed to complete onboarding." }
    }

    const memberUser = response.data.user
    const firstTimeOnboarding = response.data.firstTimeOnboarding

    if (!firstTimeOnboarding) {
      console.info(
        "Duplicate onboarding submission detected; skipping side effects.",
      )
    }

    if (memberUser.email && firstTimeOnboarding) {
      const isBuilderIntent = roleIntent
        ? BUILDER_INTENTS.has(roleIntent)
        : false

      const subscriber = {
        subscriberId: userId,
        email: memberUser.email,
        firstName: memberUser.firstName,
        lastName: memberUser.lastName,
        avatar: clerkUser.imageUrl ?? null,
      }

      const workflow = guardNovuWorkflow(NOVU_WELCOME_WORKFLOW_ID, {
        label: "welcome user",
        missingMessage: "[novu] welcome workflow id missing",
      })

      if (!workflow.ready) {
        if (workflow.reason === "novu-disabled") {
          console.info(
            "Skipping onboarding welcome workflow; Novu not configured.",
          )
        }
      } else {
        try {
          const baseUrl = resolveSiteUrl()
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
              message: `You’re in. Set up your product, publish when ready, and start getting discovered on ${siteConfig.name}.`,
              timestamp: new Date().toISOString(),
            },
            onboarding: {
              firstName: memberUser.firstName ?? null,
              isBuilder: isBuilderIntent,
            },
            links,
            tags: ["welcome"],
          }

          await triggerNovuWorkflow({
            workflowId: workflow.workflowId,
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
      revalidateUser(memberUser.id)
    }

    return { success: true }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }
    if (
      error instanceof Error &&
      error.message.trim() === INACTIVE_ACCOUNT_MESSAGE
    ) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }
    console.error("Onboarding failed:", error)
    return { error: "Failed to complete onboarding." }
  }
}
