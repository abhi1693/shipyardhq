"use server"

import { auth } from "@clerk/nextjs/server"
import { createDodoCustomerPortalLinkByEmail } from "@/lib/dodoCustomerPortal"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

export async function createBillingPortalAction() {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }
  if (!user.email) return { error: "User email not found" }

  const link = await createDodoCustomerPortalLinkByEmail(user.email)
  if (!link) return { error: "Unable to create billing portal session" }
  return { link }
}
