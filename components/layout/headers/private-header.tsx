import { auth } from "@clerk/nextjs/server"
import { getRewardBalanceByClerkId } from "@/lib/server/rewards/balance"
import { PrivateHeaderContent } from "@/components/layout/headers/private-header-content"

async function getCurrentUserRewardBalance(): Promise<number | null> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  return getRewardBalanceByClerkId(clerkUserId)
}

export default async function PrivateHeader() {
  const rewardBalance = await getCurrentUserRewardBalance()
  return <PrivateHeaderContent rewardBalance={rewardBalance ?? 0} />
}
