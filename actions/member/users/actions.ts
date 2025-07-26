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
