import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ensureDailyLoginReward } from "@/lib/server/rewards/loginReward"

export const INACTIVE_ACCOUNT_MESSAGE = "Account is not active"
export const SUSPENDED_ACCOUNT_PATH = "/auth/suspended"

const activeUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  onboardedAt: true,
} as const

export async function getActiveUserByClerkId(clerkId: string) {
  if (!clerkId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: activeUserSelect,
  })

  if (!user || user.status !== "active") {
    return null
  }

  ensureDailyLoginReward(user.id).catch((error) => {
    console.error("Failed to ensure daily login reward", {
      error,
      userId: user.id,
    })
  })

  return user
}

export async function requireActiveUserOrRedirect(clerkId?: string | null) {
  if (!clerkId) redirect(SUSPENDED_ACCOUNT_PATH)

  const user = await getActiveUserByClerkId(clerkId)
  if (!user) redirect(SUSPENDED_ACCOUNT_PATH)

  return user
}
