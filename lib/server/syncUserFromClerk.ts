import {
  readAcquisitionContext,
  saveUserAcquisition,
} from "@/lib/server/analytics/acquisitionContext"
import { trackSignupInGa } from "@/lib/server/analytics/loginTracking"
import "server-only"

import { type User as ClerkUser } from "@clerk/backend"
import prisma from "@/lib/prisma"
import { invalidateActiveUserCache } from "@/lib/server/userStatus"

export async function syncUserFromClerk(clerkUser: ClerkUser) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const firstName = clerkUser.firstName ?? ""
  const lastName = clerkUser.lastName ?? ""

  if (!email) {
    throw new Error("Clerk user email is required but missing.")
  }

  const existed = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
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
    select: {
      id: true,
    },
  })

  const context = await saveUserAcquisition(
    user.id,
    await readAcquisitionContext(),
  )
  if (!existed)
    await trackSignupInGa({ userId: user.id, method: "account", context })
  await invalidateActiveUserCache(clerkUser.id)
}
