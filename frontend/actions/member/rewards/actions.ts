"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@clerk/nextjs/server"

import { redeem } from "@/lib/rewards/engine"
import {
  RewardsError,
  RewardsInsufficientBalanceError,
  RedemptionLimitError,
  RedemptionValidationError,
} from "@/lib/rewards/errors"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import {
  MEMBER_OVERVIEW_PATH,
  MEMBER_REWARDS_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"
import type { RedeemOptions } from "@/lib/rewards/types"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"

import type { MemberRewardsSnapshot, RedeemFormState } from "./types"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type MemberRewardsSnapshotApi = {
  balance: {
    balance: number
    lifetimeEarned: number
    lifetimeSpent: number
    lifetimeAdjusted: number
    currentStreakCount: number
    longestStreakCount: number
    currentStreakTier: string | null
    streakActiveThrough: string | null
    lastEarnedAt: string | null
    lastRedeemedAt: string | null
  }
  transactions: Array<{
    id: string
    type: MemberRewardsSnapshot["transactions"][number]["type"]
    rewardAmount: number
    balanceAfter: number
    createdAt: string | null
    ruleKey: string | null
    ruleName: string | null
    rewardKey: string | null
    rewardName: string | null
    productId: string | null
    productName: string | null
    metadata: MemberRewardsSnapshot["transactions"][number]["metadata"]
    notes: string | null
    adjustmentAmount: number | null
  }>
  catalog: Array<
    Omit<
      MemberRewardsSnapshot["catalog"][number],
      "createdAt" | "updatedAt"
    > & {
      createdAt?: string | null
      updatedAt?: string | null
    }
  >
  activeEntitlements: Array<{
    id: string
    featureKey: string
    name: string
    status: MemberRewardsSnapshot["activeEntitlements"][number]["status"]
    startsAt: string | null
    expiresAt: string | null
    productId: string | null
    productName: string | null
    productSlug: string | null
  }>
  recentRedemptions: Array<{
    id: string
    featureKey: string
    name: string
    status: MemberRewardsSnapshot["recentRedemptions"][number]["status"]
    cost: number
    createdAt: string | null
    startsAt: string | null
    activatedAt: string | null
    expiresAt: string | null
    productId: string | null
    productName: string | null
    productSlug: string | null
    placementStatus?: MemberRewardsSnapshot["recentRedemptions"][number]["placementStatus"]
  }>
  productOptions: Array<{
    id: string
    name: string
    slug: string
    status: MemberRewardsSnapshot["productOptions"][number]["status"]
  }>
}

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) return null
  return authResult.getToken().catch(() => null)
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

async function requireCurrentUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthenticated")
  }
  const user = await getActiveUserByClerkId(userId)
  if (!user) {
    throw new Error(INACTIVE_ACCOUNT_MESSAGE)
  }
  return user
}

function getFastApiErrorDetail(error: unknown): string | null {
  const info = (error as FastApiError | undefined)?.info as
    | { detail?: unknown }
    | undefined
  if (typeof info?.detail === "string") {
    return info.detail
  }
  return null
}

export async function getMemberRewardsSnapshot(): Promise<MemberRewardsSnapshot> {
  const authToken = await getAuthToken()
  if (!authToken) {
    throw new Error("Unauthenticated")
  }

  const emptySnapshot: MemberRewardsSnapshot = {
    balance: {
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lifetimeAdjusted: 0,
      currentStreakCount: 0,
      longestStreakCount: 0,
      currentStreakTier: null,
      streakActiveThrough: null,
      lastEarnedAt: null,
      lastRedeemedAt: null,
    },
    transactions: [],
    catalog: [],
    activeEntitlements: [],
    recentRedemptions: [],
    productOptions: [],
  }

  try {
    const response = await fastapiFetch<ApiResponse<MemberRewardsSnapshotApi>>(
      "/api/v1/member/rewards/snapshot",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200 || !response.data) {
      return emptySnapshot
    }

    const payload = response.data

    return {
      balance: {
        ...payload.balance,
        streakActiveThrough: parseOptionalDate(payload.balance.streakActiveThrough),
        lastEarnedAt: parseOptionalDate(payload.balance.lastEarnedAt),
        lastRedeemedAt: parseOptionalDate(payload.balance.lastRedeemedAt),
      },
      transactions: payload.transactions.map((transaction) => ({
        ...transaction,
        createdAt: parseOptionalDate(transaction.createdAt) ?? new Date(0),
      })),
      catalog: payload.catalog.map((item) => ({
        id: item.id,
        featureKey: item.featureKey,
        planFeatureKey: item.planFeatureKey ?? null,
        name: item.name,
        description: item.description ?? null,
        category: item.category,
        baseCost: item.baseCost,
        durationSeconds: item.durationSeconds ?? null,
        isActive: item.isActive,
        maxActivePerUser: item.maxActivePerUser ?? null,
        maxPendingPerUser: item.maxPendingPerUser ?? null,
        requiresProduct: item.requiresProduct,
        metadata: item.metadata ?? null,
        createdAt: parseOptionalDate(item.createdAt ?? null) ?? new Date(0),
        updatedAt: parseOptionalDate(item.updatedAt ?? null) ?? new Date(0),
        canAfford: item.canAfford,
        canRedeem: item.canRedeem,
        reasons: item.reasons,
        activeCount: item.activeCount,
        pendingCount: item.pendingCount,
        requiresSchedule: item.requiresSchedule,
      })),
      activeEntitlements: payload.activeEntitlements.map((entitlement) => ({
        ...entitlement,
        startsAt: parseOptionalDate(entitlement.startsAt),
        expiresAt: parseOptionalDate(entitlement.expiresAt),
      })),
      recentRedemptions: payload.recentRedemptions.map((redemption) => ({
        ...redemption,
        createdAt: parseOptionalDate(redemption.createdAt) ?? new Date(0),
        startsAt: parseOptionalDate(redemption.startsAt),
        activatedAt: parseOptionalDate(redemption.activatedAt),
        expiresAt: parseOptionalDate(redemption.expiresAt),
      })),
      productOptions: payload.productOptions,
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      throw new Error(INACTIVE_ACCOUNT_MESSAGE)
    }
    if (status === 404 || status === 422) {
      return emptySnapshot
    }
    throw error
  }
}

export async function redeemCatalogItemAction(
  _prevState: RedeemFormState,
  formData: FormData,
): Promise<RedeemFormState> {
  const user = await requireCurrentUser()

  const featureKey = formData.get("featureKey")?.toString().trim()
  if (!featureKey) {
    return { status: "error", message: "Missing reward selection" }
  }

  const productIdRaw = formData.get("productId")?.toString().trim()
  const notesRaw = formData.get("notes")?.toString().trim()
  const slotKeyRaw = formData.get("slotKey")?.toString().trim()

  try {
    const options: RedeemOptions = {
      productId: productIdRaw && productIdRaw.length ? productIdRaw : undefined,
      notes: notesRaw && notesRaw.length ? notesRaw : undefined,
    }

    if (slotKeyRaw && slotKeyRaw.length) {
      const now = new Date()
      const startsAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          now.getUTCHours(),
          now.getUTCMinutes(),
          now.getUTCSeconds(),
          now.getUTCMilliseconds(),
        ),
      )

      options.reservation = {
        startsAt,
        slotKey: slotKeyRaw,
      }
    }

    const result = await redeem(user.id, featureKey, options)

    revalidatePath(MEMBER_REWARDS_PATH)
    revalidatePath(MEMBER_PRODUCTS_PATH)
    revalidatePath(MEMBER_OVERVIEW_PATH)

    return {
      status: "success",
      redemptionId: result.redemption.id,
      balanceAfter: result.transaction.balanceAfter,
      message: `Redeemed ${result.catalogItem.name}`,
    }
  } catch (error) {
    console.error("Failed to redeem catalog item", error)

    if (error instanceof RewardsInsufficientBalanceError) {
      return { status: "error", message: "You do not have enough rewards" }
    }
    if (error instanceof RedemptionLimitError) {
      return {
        status: "error",
        message: "You reached the limit for this reward",
      }
    }
    if (error instanceof RedemptionValidationError) {
      return { status: "error", message: error.message }
    }
    if (error instanceof RewardsError) {
      return { status: "error", message: error.message }
    }

    const detail = getFastApiErrorDetail(error)
    if (detail) {
      return { status: "error", message: detail }
    }

    return {
      status: "error",
      message: "We couldn't complete that redemption",
    }
  }
}
