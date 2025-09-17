"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import {
  subscribeToNewsletterAction,
  unsubscribeFromNewsletterAction,
} from "@/actions/public/newsletter/actions"
import { getActiveUserByClerkId, INACTIVE_ACCOUNT_MESSAGE } from "@/lib/server/userStatus"

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth()
  if (!userId) return { error: "Not authenticated" }

  const roleIntent = formData.get("roleIntent")?.toString()
  const heardFrom = formData.get("heardFrom")?.toString()
  const acceptedTerms = formData.get("acceptedTerms") === "on"
  const newsletterOptInRaw = formData.get("newsletterOptIn")?.toString()
  const newsletterOptIn =
    newsletterOptInRaw === "true" || newsletterOptInRaw === "on"

  try {
    const client = await clerkClient()
    // 1. Update public metadata in Clerk
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role: "member",
      },
    })

    // 2. Get the local user by Clerk ID
    const user = await getActiveUserByClerkId(userId)

    if (!user) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    // 3. Update user data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        roleIntent,
        acceptedTerms,
        termsAcceptedAt: acceptedTerms ? new Date() : null,
        heardFrom,
      },
    })

    if (user.email) {
      if (newsletterOptIn) {
        const result = await subscribeToNewsletterAction(user.email)
        if (result.error) {
          console.error("Failed to auto-opt user into newsletter:", result.error)
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
    }

    return { success: true }
  } catch (error) {
    console.error("Onboarding failed:", error)
    return { error: "Failed to complete onboarding." }
  }
}
