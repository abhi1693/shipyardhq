import prisma from "@/lib/prisma"
import { adjustRewards, awardRewards } from "@/lib/rewards/engine"
import {
  RewardsError,
  RewardsInsufficientBalanceError,
} from "@/lib/rewards/errors"
import type {
  AdjustRewardsOptions,
  AwardRewardsPayload,
} from "@/lib/rewards/types"

const IGNORED_ERROR_CODES = new Set([
  "COOLDOWN_ACTIVE",
  "CAP_EXCEEDED",
  "INSUFFICIENT_BALANCE",
])

export async function getProductOwnerId(
  productId: string,
): Promise<string | null> {
  const record = await prisma.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  })

  return record?.userId ?? null
}

export async function awardRewardsSafely(
  userId: string,
  ruleKey: string,
  payload: AwardRewardsPayload,
  context: string,
) {
  try {
    await awardRewards(userId, ruleKey, payload)
  } catch (error) {
    if (error instanceof RewardsError && IGNORED_ERROR_CODES.has(error.code)) {
      return
    }

    console.error(`[rewards] ${context} failed`, {
      error,
      userId,
      ruleKey,
      payload,
    })
  }
}

export async function adjustRewardsSafely(
  userId: string,
  amount: number,
  options: AdjustRewardsOptions,
  context: string,
) {
  try {
    await adjustRewards(userId, amount, options)
  } catch (error) {
    if (
      error instanceof RewardsError &&
      IGNORED_ERROR_CODES.has(error.code)
    ) {
      return
    }
    if (error instanceof RewardsInsufficientBalanceError) {
      return
    }

    console.error(`[rewards] ${context} adjustment failed`, {
      error,
      userId,
      amount,
      options,
    })
  }
}
