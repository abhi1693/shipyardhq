"use server"

import { type User as ClerkUser } from "@clerk/backend"
import prisma from "@/lib/prisma"
import { clerkClient } from "@clerk/nextjs/server"

export async function syncUserFromClerk(clerkUser: ClerkUser) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const firstName = clerkUser.firstName ?? ""
  const lastName = clerkUser.lastName ?? ""

  if (!email) {
    throw new Error("Clerk user email is required but missing.")
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      clerkId: clerkUser.id,
      firstName,
      lastName,
      updatedAt: new Date(),
    },
    create: {
      email,
      clerkId: clerkUser.id,
      firstName,
      lastName,
    },
  })

  try {
    const client = await clerkClient()
    const existingPublicMetadata =
      (clerkUser.publicMetadata as Record<string, unknown> | null) ?? {}

    await client.users.updateUser(clerkUser.id, {
      publicMetadata: { ...existingPublicMetadata, status: user.status },
    })
  } catch (error) {
    console.error("Failed to sync user status metadata:", error)
  }
}

export async function getUserByClerkId(clerkId: string) {
  if (!clerkId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, status: true },
  })

  if (user?.status === "active") {
    return { id: user.id }
  }

  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(clerkId)
    await syncUserFromClerk(clerkUser)
  } catch (error) {
    console.error("Failed to sync user from Clerk:", error)
    return null
  }

  const refreshedUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, status: true },
  })

  if (!refreshedUser || refreshedUser.status !== "active") {
    return null
  }

  return { id: refreshedUser.id }
}
