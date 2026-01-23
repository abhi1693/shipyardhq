import prisma from "@/lib/prisma"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export async function getRewardBalanceByClerkId(
  clerkUserId: string,
): Promise<number | null> {
  const user = await getActiveUserByClerkId(clerkUserId)
  if (!user) return null

  const balanceRecord = await prisma.rewardBalance.findUnique({
    where: { userId: user.id },
    select: { balance: true },
  })

  return balanceRecord?.balance ?? 0
}
