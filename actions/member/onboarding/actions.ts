"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import {
  subscribeToNewsletterAction,
  unsubscribeFromNewsletterAction,
} from "@/actions/public/newsletter/actions"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { sendEmail } from "@/lib/email/resend"
import {
  buildWelcomeTextBody,
  WelcomeEmail,
} from "@/lib/email/templates/onboarding/welcome"
import { getAppBaseUrl } from "@/lib/email/utils"
import {
  LEADERBOARD_GUIDE_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_PATH,
  MEMBER_FEEDBACK_PATH,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"
import { IS_PROD } from "@/lib/constants"

const BUILDER_INTENTS = new Set(["launch-product", "manage-team"])
const WELCOME_EMAIL_SUBJECT = "Welcome aboard ShipYardHQ"

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth()
  if (!userId) return { error: "Not authenticated" }

  const roleIntent = formData.get("roleIntent")?.toString()
  const heardFrom = formData.get("heardFrom")?.toString()
  const newsletterOptInRaw = formData.get("newsletterOptIn")
  const normalizedNewsletterOptIn = newsletterOptInRaw
    ?.toString()
    .trim()
    .toLowerCase()
  const newsletterOptIn =
    normalizedNewsletterOptIn == null
      ? true
      : normalizedNewsletterOptIn === "true" ||
        normalizedNewsletterOptIn === "on" ||
        normalizedNewsletterOptIn === "1"

  try {
    const client = await clerkClient()
    // 1. Update public metadata in Clerk
    const clerkUser = await client.users.getUser(userId)

    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role: "member",
      },
    })

    // 2. Get the local user by Clerk ID
    let user = await getActiveUserByClerkId(userId)

    if (!user) {
      await syncUserFromClerk(clerkUser)
      user = await getActiveUserByClerkId(userId)
    }

    if (!user) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    // 3. Update user data only once; skip downstream work if already onboarded
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
      if (newsletterOptIn) {
        const result = await subscribeToNewsletterAction(user.email)
        if (result.error) {
          console.error(
            "Failed to auto-opt user into newsletter:",
            result.error,
          )
        }
      } else {
        const result = await unsubscribeFromNewsletterAction(user.email)
        if (result.error) {
          console.error(
            "Failed to respect newsletter opt-out during onboarding:",
            result.error,
          )
        }
      }

      const isBuilderIntent = roleIntent
        ? BUILDER_INTENTS.has(roleIntent)
        : false

      const shouldSendWelcomeEmail = IS_PROD || process.env.NODE_ENV === "test"
      const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

      if (!shouldSendWelcomeEmail || !configuredBaseUrl) {
        console.info("Skipping onboarding welcome email.")
      } else {
        try {
          const baseUrl = getAppBaseUrl()
          const emailProps = {
            firstName: user.firstName,
            dashboardUrl: `${baseUrl}${MEMBER_OVERVIEW_PATH}`,
            isBuilder: isBuilderIntent,
            leaderboardUrl: `${baseUrl}${LEADERBOARD_PATH}`,
            monthlyUrl: `${baseUrl}${LEADERBOARD_MONTHLY_PATH}`,
            guideUrl: `${baseUrl}${LEADERBOARD_GUIDE_PATH}`,
            feedbackUrl: `${baseUrl}${MEMBER_FEEDBACK_PATH}`,
          }

          await sendEmail({
            to: user.email,
            subject: WELCOME_EMAIL_SUBJECT,
            react: WelcomeEmail(emailProps),
            text: buildWelcomeTextBody(emailProps),
          })
        } catch (error) {
          console.error("Failed to send onboarding welcome email:", error)
        }
      }
    }

    const cookieStore = await cookies()
    cookieStore.set({
      name: "shipyard_onboarding_override",
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60, // allow a short grace period while session claims refresh
    })

    return { success: true }
  } catch (error) {
    console.error("Onboarding failed:", error)
    return { error: "Failed to complete onboarding." }
  }
}
