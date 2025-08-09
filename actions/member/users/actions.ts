"use server"

import { type User as ClerkUser } from "@clerk/backend"
import prisma from "@/lib/prisma"

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
  })
}

export async function getUserByClerkId(clerkId: string) {
  if (!clerkId) {
    throw new Error("Clerk ID is required but missing.")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })

  if (!user) {
    throw new Error(`User with Clerk ID ${clerkId} not found.`)
  }

  return user
}
