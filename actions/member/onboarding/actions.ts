"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth()
  if (!userId) return { error: "Not authenticated" }

  const roleIntent = formData.get("roleIntent")?.toString()
  const productInterest = formData.get("productInterest")?.toString()
  const heardFrom = formData.get("heardFrom")?.toString()
  const jobTitle = formData.get("jobTitle")?.toString()
  const orgName = formData.get("organizationName")?.toString()
  const orgUrl = formData.get("organizationUrl")?.toString()
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
        productInterest,
        acceptedTerms,
        termsAcceptedAt: acceptedTerms ? new Date() : null,
        heardFrom,
      },
    })

    // 4. Optionally connect to or create organization and assign membership
    if (orgUrl) {
      const org = await prisma.organization.upsert({
        where: { url: orgUrl },
        update: { name: orgName || orgUrl },
        create: {
          name: orgName || orgUrl,
          url: orgUrl,
        },
      })

      await prisma.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id,
          },
        },
        update: { jobTitle },
        create: {
          userId: user.id,
          organizationId: org.id,
          jobTitle,
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Onboarding failed:", error)
    return { error: "Failed to complete onboarding." }
  }
}
