import prisma from "@/lib/prisma"
import { awardRewards } from "@/lib/rewards/engine"
import { RewardsError } from "@/lib/rewards/errors"
import type { AwardRewardsPayload } from "@/lib/rewards/types"

const IGNORED_ERROR_CODES = new Set(["COOLDOWN_ACTIVE", "CAP_EXCEEDED"])

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
