"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { createDodoCustomerPortalLinkByEmail } from "@/lib/dodoCustomerPortal"

export async function createCustomerPortalAction(sendEmail = false) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { email: true },
  })
  if (!user?.email) return { error: "User email not found" }

  const link = await createDodoCustomerPortalLinkByEmail(user.email, {
    sendEmail,
  })
  if (!link) return { error: "Unable to create customer portal session" }
  return { link }
}
