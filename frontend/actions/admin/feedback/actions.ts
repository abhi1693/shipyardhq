"use server"

import prisma from "@/lib/prisma"
import { awardRewards } from "@/lib/rewards/engine"
import {
  RewardRuleInactiveError,
  RewardRuleNotFoundError,
  RewardsCapExceededError,
  RewardsCooldownError,
  RewardsError,
} from "@/lib/rewards/errors"
import { checkRole } from "@/lib/roles"
import { adminPath, MEMBER_FEEDBACK_PATH } from "@/lib/routes"
import { FeedbackStatus, Prisma } from "@/lib/vendor/prisma/client"
import { revalidatePath } from "next/cache"

const feedbackSelect = {
  id: true,
  subject: true,
  message: true,
  rating: true,
  status: true,
  adminNote: true,
  rewardEligible: true,
  rewardGrantedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.MemberFeedbackSelect

export type AdminFeedbackEntry = Prisma.MemberFeedbackGetPayload<{
  select: typeof feedbackSelect
}>

const ADMIN_FEEDBACK_PATH = adminPath("feedback")
const FEEDBACK_REWARD_RULE_KEY = "rewards.feedback.close" as const

function revalidateFeedbackPaths() {
  revalidatePath(ADMIN_FEEDBACK_PATH)
  revalidatePath(MEMBER_FEEDBACK_PATH)
}

export async function getFeedbackEntries({
  skip = 0,
  take = 20,
  status,
}: {
  skip?: number
  take?: number
  status?: FeedbackStatus | "all"
} = {}) {
  try {
    const where: Prisma.MemberFeedbackWhereInput = {}
    if (status && status !== "all") {
      where.status = status
    }

    return await prisma.memberFeedback.findMany({
      select: feedbackSelect,
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    })
  } catch (error) {
    console.error("getFeedbackEntries failed", error)
    throw new Error("Unable to load feedback")
  }
}

export async function getFeedbackCount({
  status,
}: {
  status?: FeedbackStatus | "all"
} = {}) {
  try {
    const where: Prisma.MemberFeedbackWhereInput = {}
    if (status && status !== "all") {
      where.status = status
    }
    return await prisma.memberFeedback.count({ where })
  } catch (error) {
    console.error("getFeedbackCount failed", error)
    throw new Error("Unable to count feedback entries")
  }
}

export async function updateFeedbackStatus({
  id,
  status,
}: {
  id: string
  status: FeedbackStatus
}) {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      return { error: "Unauthorized" }
    }

    const existing = await prisma.memberFeedback.findUnique({
      where: { id },
      select: {
        status: true,
        userId: true,
        rewardEligible: true,
        rewardGrantedAt: true,
      },
    })

    if (!existing) {
      return { error: "Feedback not found" }
    }

    if (existing.status === status) {
      revalidateFeedbackPaths()
      return { success: true }
    }

    await prisma.memberFeedback.update({
      where: { id },
      data: { status },
    })

    if (
      status === FeedbackStatus.closed &&
      existing.rewardEligible &&
      !existing.rewardGrantedAt
    ) {
      try {
        const result = await awardRewards(
          existing.userId,
          FEEDBACK_REWARD_RULE_KEY,
          {
            eventId: `feedback:${id}:closed`,
            sourceType: "feedback",
            sourceId: id,
            targetType: "feedback",
            targetId: id,
          },
        )

        const grantedAt = existing.rewardGrantedAt
          ? existing.rewardGrantedAt
          : result.transaction.createdAt

        await prisma.memberFeedback.update({
          where: { id },
          data: { rewardGrantedAt: grantedAt },
        })
      } catch (error) {
        await prisma.memberFeedback.update({
          where: { id },
          data: { status: existing.status },
        })

        let message = "Unable to award rewards for this feedback."
        if (error instanceof RewardRuleNotFoundError) {
          message = "Feedback reward rule is not configured."
        } else if (error instanceof RewardRuleInactiveError) {
          message = "Feedback reward rule is currently inactive."
        } else if (error instanceof RewardsCapExceededError) {
          message = "Feedback reward cap has been reached."
        } else if (error instanceof RewardsCooldownError) {
          message =
            "Feedback reward cooldown is active. Please try again later."
        } else if (error instanceof RewardsError) {
          message = error.message
        } else {
          console.error("awardRewards failed", error)
        }

        return { error: message }
      }
    }

    revalidateFeedbackPaths()
    return { success: true }
  } catch (error) {
    console.error("updateFeedbackStatus failed", error)
    return { error: "Unable to update feedback status" }
  }
}

export async function updateFeedbackAdminNote({
  id,
  note,
}: {
  id: string
  note?: string
}) {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      return { error: "Unauthorized" }
    }

    const adminNote = note?.trim() ?? null
    if (adminNote && adminNote.length > 2000) {
      return { error: "Admin note must be 2000 characters or fewer" }
    }

    await prisma.memberFeedback.update({
      where: { id },
      data: { adminNote },
    })

    revalidateFeedbackPaths()
    return { success: true }
  } catch (error) {
    console.error("updateFeedbackAdminNote failed", error)
    return { error: "Unable to update admin note" }
  }
}

export async function updateFeedbackRewardEligibility({
  id,
  rewardEligible,
}: {
  id: string
  rewardEligible: boolean
}) {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      return { error: "Unauthorized" }
    }

    const existing = await prisma.memberFeedback.findUnique({
      where: { id },
      select: { rewardEligible: true, rewardGrantedAt: true },
    })

    if (!existing) {
      return { error: "Feedback not found" }
    }

    if (existing.rewardGrantedAt) {
      return {
        error:
          "Rewards already granted for this feedback. Eligibility can no longer be changed.",
      }
    }

    if (existing.rewardEligible === rewardEligible) {
      return { success: true }
    }

    await prisma.memberFeedback.update({
      where: { id },
      data: { rewardEligible },
    })

    revalidateFeedbackPaths()
    return { success: true }
  } catch (error) {
    console.error("updateFeedbackRewardEligibility failed", error)
    return { error: "Unable to update reward eligibility" }
  }
}
