"use server"

import { auth } from "@clerk/nextjs/server"

import { getRewardBalanceByClerkId } from "@/lib/server/rewards/balance"

export async function getCurrentUserRewardBalanceAction(): Promise<number> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthenticated")
  }

  const balance = await getRewardBalanceByClerkId(userId)
  return balance ?? 0
}
