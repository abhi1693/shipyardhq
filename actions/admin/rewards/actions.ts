"use server"

import { revalidatePath } from "next/cache"
import crypto from "node:crypto"

import prisma from "@/lib/prisma"
import {
  RewardTransactionType,
  RewardRuleCategory,
  type Prisma,
} from "@/lib/vendor/prisma/client"
import { adminPath } from "@/lib/routes"
import { parseInteger } from "./utils"
import { adjustRewards, refundRedemption } from "@/lib/rewards/engine"
import {
  RewardsError,
  RewardsInsufficientBalanceError,
} from "@/lib/rewards/errors"
import { auth } from "@clerk/nextjs/server"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import type {
  AdjustRewardsFormState,
  RefundRewardsFormState,
} from "./form-state"

const DEFAULT_LIMIT = 20

type PaginationArgs = {
  skip?: number
  take?: number
}

type RuleInput = {
  name: string
  key: string
  description?: string | null
  category: RewardRuleCategory
  baseRewardAmount: number
  isActive: boolean
  dailyCap?: number | null
  lifetimeCap?: number | null
  globalCooldownSeconds?: number | null
  perTargetCooldownSeconds?: number | null
  metadata?: Prisma.InputJsonValue
  tierConfig?: Prisma.InputJsonValue
  adminNotes?: string | null
}

function parseJson(
  value: FormDataEntryValue | null,
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined
  const raw = value.toString().trim()
  if (!raw.length) return undefined
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error("Failed to parse JSON payload", error)
    throw new Error("Invalid JSON payload")
  }
}

function parseRuleForm(formData: FormData): RuleInput {
  const name = formData.get("name")?.toString().trim()
  const key = formData.get("key")?.toString().trim()
  const categoryRaw = formData.get("category")?.toString() as
    | keyof typeof RewardRuleCategory
    | undefined
  const baseRewardAmount = parseInteger(
    formData.get("baseRewardAmount"),
    "Base reward amount",
  )

  if (!name) throw new Error("Rule name is required")
  if (!key) throw new Error("Rule key is required")
  if (!categoryRaw || !(categoryRaw in RewardRuleCategory)) {
    throw new Error("Invalid category")
  }
  if (!baseRewardAmount || baseRewardAmount <= 0) {
    throw new Error("Base reward amount must be greater than zero")
  }

  const isActive =
    formData.get("isActive") === "true" || formData.get("isActive") === "on"

  const description = formData.get("description")?.toString().trim() || null
  const adminNotes = formData.get("adminNotes")?.toString().trim() || null

  return {
    name,
    key,
    description,
    category: RewardRuleCategory[categoryRaw],
    baseRewardAmount,
    isActive,
    dailyCap: parseInteger(formData.get("dailyCap"), "Daily cap"),
    lifetimeCap: parseInteger(formData.get("lifetimeCap"), "Lifetime cap"),
    globalCooldownSeconds: parseInteger(
      formData.get("globalCooldownSeconds"),
      "Global cooldown",
    ),
    perTargetCooldownSeconds: parseInteger(
      formData.get("perTargetCooldownSeconds"),
      "Per-target cooldown",
    ),
    metadata: parseJson(formData.get("metadata")),
    tierConfig: parseJson(formData.get("tierConfig")),
    adminNotes,
  }
}

export async function getRewardRules(args: PaginationArgs = {}) {
  await resolveAdminUser()
  const { skip = 0, take = DEFAULT_LIMIT } = args
  try {
    return await prisma.rewardRule.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    })
  } catch (error) {
    console.error("Failed to fetch reward rules", error)
    throw new Error("Unable to load reward rules")
  }
}

export async function getRewardRulesCount() {
  await resolveAdminUser()
  try {
    return await prisma.rewardRule.count()
  } catch (error) {
    console.error("Failed to count reward rules", error)
    throw new Error("Unable to count reward rules")
  }
}

export async function getRewardRuleById(id: string) {
  await resolveAdminUser()
  try {
    return await prisma.rewardRule.findUnique({ where: { id } })
  } catch (error) {
    console.error("Failed to fetch reward rule", error)
    throw new Error("Unable to load reward rule")
  }
}

export async function createRewardRuleAction(formData: FormData) {
  await resolveAdminUser()
  const input = parseRuleForm(formData)
  try {
    const existing = await prisma.rewardRule.findUnique({
      where: { key: input.key },
    })
    if (existing) {
      return { error: "A reward rule with that key already exists." }
    }

    await prisma.rewardRule.create({ data: input })
    revalidatePath(adminPath("rewards", "rules"))
    return { success: true }
  } catch (error) {
    console.error("Failed to create reward rule", error)
    return { error: "Failed to create reward rule." }
  }
}

export async function updateRewardRuleAction(id: string, formData: FormData) {
  await resolveAdminUser()
  const input = parseRuleForm(formData)
  try {
    await prisma.rewardRule.update({ where: { id }, data: input })
    revalidatePath(adminPath("rewards", "rules"))
    return { success: true }
  } catch (error) {
    console.error("Failed to update reward rule", error)
    return { error: "Failed to update reward rule." }
  }
}

export async function toggleRewardRuleAction(id: string, isActive: boolean) {
  await resolveAdminUser()
  try {
    await prisma.rewardRule.update({ where: { id }, data: { isActive } })
    revalidatePath(adminPath("rewards", "rules"))
    return { success: true }
  } catch (error) {
    console.error("Failed to toggle reward rule", error)
    return { error: "Failed to update rule state." }
  }
}

export async function getRewardTransactions(
  args: PaginationArgs & { type?: RewardTransactionType | "all" } = {},
) {
  await resolveAdminUser()
  const { skip = 0, take = DEFAULT_LIMIT, type = "all" } = args
  try {
    return await prisma.rewardTransaction.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      where: type === "all" ? undefined : { type },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rule: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        catalogItem: {
          select: {
            featureKey: true,
            name: true,
          },
        },
        redemption: {
          select: {
            id: true,
            status: true,
            featureKey: true,
          },
        },
      },
    })
  } catch (error) {
    console.error("Failed to fetch reward transactions", error)
    throw new Error("Unable to load reward transactions")
  }
}

export async function getRewardTransactionsCount(
  type: RewardTransactionType | "all" = "all",
) {
  await resolveAdminUser()
  try {
    return await prisma.rewardTransaction.count({
      where: type === "all" ? undefined : { type },
    })
  } catch (error) {
    console.error("Failed to count reward transactions", error)
    throw new Error("Unable to count reward transactions")
  }
}

function parseAdjustmentAmount(raw: FormDataEntryValue | null) {
  if (raw == null) {
    throw new Error("Enter an amount")
  }
  const value = raw.toString().trim()
  if (!value.length) {
    throw new Error("Enter an amount")
  }
  const parsed = parseInteger(raw, "Amount")
  if (parsed == null) {
    throw new Error("Enter an amount")
  }
  if (parsed === 0) {
    throw new Error("Amount must be non-zero")
  }
  return parsed
}

async function resolveAdminUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Not authenticated")
  }
  const adminUser = await getActiveUserByClerkId(userId)
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("Unauthorized")
  }
  return adminUser
}

export async function adjustUserRewardsAction(
  _prevState: AdjustRewardsFormState,
  formData: FormData,
): Promise<AdjustRewardsFormState> {
  try {
    const adminUser = await resolveAdminUser()

    const userIdRaw = formData.get("userId")
    if (typeof userIdRaw !== "string" || !userIdRaw.trim().length) {
      throw new Error("Select a user")
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userIdRaw.trim() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!targetUser) {
      throw new Error("User not found")
    }

    const amount = parseAdjustmentAmount(formData.get("amount"))
    const notesRaw = formData.get("notes")?.toString().trim()
    const reason = notesRaw && notesRaw.length ? notesRaw : null
    if (!reason) {
      throw new Error("Add a short reason for the adjustment")
    }

    const reference = formData.get("reference")?.toString().trim()
    const eventId = `admin-adjust:${crypto.randomUUID()}`

    const metadata = {
      source: "admin-panel",
      reference: reference && reference.length ? reference : undefined,
      initiatedBy: {
        id: adminUser.id,
        email: adminUser.email,
      },
      target: {
        id: targetUser.id,
        email: targetUser.email,
      },
      adjustment: {
        amount,
      },
    }

    await adjustRewards(targetUser.id, amount, {
      actorUserId: adminUser.id,
      notes: reason,
      metadata,
      eventId,
    })

    revalidatePath(adminPath("rewards", "transactions"))
    revalidatePath(adminPath("rewards", "adjust"))

    return {
      status: "success",
      message: `Adjustment queued. ${amount > 0 ? "Granted" : "Removed"} ${Math.abs(amount)} rewards from ${targetUser.email ?? targetUser.id}.`,
    }
  } catch (error) {
    if (error instanceof RewardsInsufficientBalanceError) {
      return {
        status: "error",
        message: "User does not have enough rewards for that deduction.",
      }
    }
    if (error instanceof RewardsError) {
      return { status: "error", message: error.message }
    }
    console.error("Failed to adjust user rewards", error)
    const message =
      error instanceof Error ? error.message : "Failed to adjust rewards."
    return {
      status: "error",
      message,
    }
  }
}

export async function refundRedemptionAction(
  _prevState: RefundRewardsFormState,
  formData: FormData,
): Promise<RefundRewardsFormState> {
  try {
    const adminUser = await resolveAdminUser()

    const redemptionIdRaw = formData.get("redemptionId")
    if (typeof redemptionIdRaw !== "string" || !redemptionIdRaw.trim()) {
      throw new Error("Select a redemption to refund")
    }
    const redemptionId = redemptionIdRaw.trim()

    const reason = formData.get("reason")?.toString().trim()
    if (!reason) {
      throw new Error("Add a short reason for the refund")
    }

    const referenceRaw = formData.get("reference")?.toString().trim()
    const reference = referenceRaw && referenceRaw.length ? referenceRaw : null

    const revertPerkRaw = formData.get("revertPerk")?.toString().trim()
    const revertPerk = revertPerkRaw === "true"

    const result = await refundRedemption(redemptionId, {
      actorUserId: adminUser.id,
      reason,
      reference,
      revertPerk,
    })

    revalidatePath(adminPath("rewards", "transactions"))
    revalidatePath(adminPath("rewards", "refunds"))

    return {
      status: "success",
      message: `Refunded ${result.refundedAmount} rewards (${result.fullyRefunded ? "full" : "partial"}).`,
    }
  } catch (error) {
    console.error("Failed to refund redemption", error)
    if (error instanceof RewardsError) {
      return { status: "error", message: error.message }
    }
    const message =
      error instanceof Error ? error.message : "Failed to refund redemption."
    return {
      status: "error",
      message,
    }
  }
}
