import { auth } from "@clerk/nextjs/server"

import { getMemberTrafficSummary as fetchMemberTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"

type UserRef = { id: string }

async function getCurrentUser(): Promise<UserRef> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await requireActiveUserOrRedirect(userId)
  return { id: user.id }
}

export async function getMemberTrafficOverview(days = 7) {
  const { id } = await getCurrentUser()

  return fetchMemberTrafficSummary(id, {
    rangeDays: days,
    previousComparison: false,
    includeAdvanced: false,
    includeEngagement: true,
    includeProductBreakdown: false,
    includeReferrerMatrix: false,
  })
}
