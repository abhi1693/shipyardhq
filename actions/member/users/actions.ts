"use server"

import { type User as ClerkUser } from "@clerk/backend"
import prisma from "@/lib/prisma"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { invalidateActiveUserCache } from "@/lib/server/userStatus"
import {
  ensureNovuSubscriber,
  isNovuEnabled,
} from "@/lib/server/notifications/novu"

export async function syncUserFromClerk(clerkUser: ClerkUser) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const firstName = clerkUser.firstName ?? ""
  const lastName = clerkUser.lastName ?? ""

  if (!email) {
    throw new Error("Clerk user email is required but missing.")
  }

  await prisma.user.upsert({
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
    select: {
      id: true,
    },
  })

  if (isNovuEnabled()) {
    try {
      await ensureNovuSubscriber({
        subscriberId: clerkUser.id,
        email,
        firstName,
        lastName,
        avatar: clerkUser.imageUrl ?? null,
      })
    } catch (error) {
      console.error("[novu] failed to sync subscriber", {
        error,
        clerkId: clerkUser.id,
      })
    }
  }

  await invalidateActiveUserCache(clerkUser.id)
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
    const clerkUser = await getClerkUserByIdCached(clerkId)
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
