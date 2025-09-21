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
