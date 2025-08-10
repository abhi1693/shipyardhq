"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth()
  if (!userId) return { error: "Not authenticated" }

  const roleIntent = formData.get("roleIntent")?.toString()
  const heardFrom = formData.get("heardFrom")?.toString()
  const acceptedTerms = formData.get("acceptedTerms") === "on"

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
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return { error: "User not found in local DB." }
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

    return { success: true }
  } catch (error) {
    console.error("Onboarding failed:", error)
    return { error: "Failed to complete onboarding." }
  }
}
