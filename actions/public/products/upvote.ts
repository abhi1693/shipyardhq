"use server"

import { auth } from "@clerk/nextjs/server"
import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"
import {
  getLiveUpvoteCount,
  resolveVoteState,
  setDesiredVoteState,
} from "@/lib/server/productVotesStore"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

export type UpvoteState = { upvotes: number; upvoted: boolean; error?: string }

type TimingMark = { label: string; at: bigint }
type TimingReport = { start: bigint; marks: TimingMark[] }

type LogContext = {
  productId: string
  userId?: string | null
  overall: TimingReport
  transaction?: TimingReport
  error?: unknown
}

type CachedActiveUser = Awaited<ReturnType<typeof getActiveUserByClerkId>>

type ActiveUserCacheEntry = {
  value: CachedActiveUser
  expiresAt: number
}

const ACTIVE_USER_CACHE_TTL = 30_000

function getActiveUserCache(): Map<string, ActiveUserCacheEntry> {
  const globalWithCache = globalThis as typeof globalThis & {
    __shipyardActiveUserCache?: Map<string, ActiveUserCacheEntry>
  }

  if (!globalWithCache.__shipyardActiveUserCache) {
    globalWithCache.__shipyardActiveUserCache = new Map()
  }

  return globalWithCache.__shipyardActiveUserCache
}

async function getCachedActiveUser(clerkId: string) {
  if (!clerkId) return null
  if (process.env.NODE_ENV === "test") return getActiveUserByClerkId(clerkId)

  const cache = getActiveUserCache()
  const cached = cache.get(clerkId)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const result = await getActiveUserByClerkId(clerkId)
  cache.set(clerkId, { value: result, expiresAt: now + ACTIVE_USER_CACHE_TTL })
  return result
}

export async function upvoteProductAction(
  _prevState: UpvoteState,
  formData: FormData,
): Promise<UpvoteState> {
  const overall: TimingReport = { start: process.hrtime.bigint(), marks: [] }
  const mark = (label: string) =>
    overall.marks.push({ label, at: process.hrtime.bigint() })

  const productId = String(formData.get("productId") || "")
  let user: CachedActiveUser | null = null
  let transactionReport: TimingReport | undefined

  const finalize = (
    status: string,
    options: { transaction?: TimingReport; error?: unknown } = {},
  ) => {
    mark(status)
    logUpvoteTiming(status, {
      productId,
      userId: user?.id ?? null,
      overall,
      transaction: options.transaction,
      error: options.error,
    })
  }

  if (!productId) {
    finalize("missing_product")
    return { ..._prevState, error: "Missing productId" }
  }

  const authResult = await auth()
  mark("auth")
  if (!authResult?.userId) {
    finalize("unauthorized")
    return { ..._prevState, error: "Unauthorized" }
  }

  user = await getCachedActiveUser(authResult.userId)
  mark("user_lookup")
  if (!user) {
    finalize("inactive_user")
    return { ..._prevState, error: INACTIVE_ACCOUNT_MESSAGE }
  }

  try {
    const txReport: TimingReport = {
      start: process.hrtime.bigint(),
      marks: [],
    }
    const txMark = (label: string) =>
      txReport.marks.push({ label, at: process.hrtime.bigint() })

    const resolution = await resolveVoteState(productId, user.id)
    txMark("resolve_state")

    const desiredState =
      resolution.currentState === "upvoted" ? "not_upvoted" : "upvoted"

    const updateResult = await setDesiredVoteState({
      productId,
      userId: user.id,
      desiredState,
      client: resolution.client,
      record: resolution.record,
      persistedState: resolution.persistedState,
    })
    txMark("apply_state")

    const upvotes = await getLiveUpvoteCount(productId, updateResult.client)
    txMark("live_count")

    transactionReport = txReport
    mark("transaction")

    if (!updateResult.client) {
      revalidateProduct(productId)
      mark("revalidate_product")
      revalidateLeaderboard()
      mark("revalidate_leaderboard")
    }

    finalize("success", { transaction: transactionReport })
    return { upvotes, upvoted: updateResult.state === "upvoted" }
  } catch (err: any) {
    finalize("error", { transaction: transactionReport, error: err })
    if (err?.code === "P2003") {
      return { ..._prevState, error: "Not Found" }
    }
    console.error("Upvote action error:", err)
    return { ..._prevState, error: err?.message || "Failed" }
  }
}

function logUpvoteTiming(status: string, context: LogContext) {
  const overallSummary = summarizeTiming(context.overall)
  const transactionSummary = context.transaction
    ? summarizeTiming(context.transaction)
    : null
  const errorMessage = context.error ? getErrorMessage(context.error) : null

  const parts = [
    `[upvote] status=${status}`,
    `product=${context.productId}`,
    `user=${context.userId ?? "unknown"}`,
    `total=${overallSummary.totalMs.toFixed(2)}ms`,
    `steps=${overallSummary.segments.join(" | ") || "none"}`,
  ]

  if (transactionSummary) {
    parts.push(
      `txTotal=${transactionSummary.totalMs.toFixed(2)}ms`,
      `txSteps=${transactionSummary.segments.join(" | ") || "none"}`,
    )
  }

  if (errorMessage) {
    parts.push(`error=${errorMessage}`)
  }

  if (!errorMessage) {
    return
  }

  console.error(parts.join(" "))
}

function summarizeTiming(report: TimingReport) {
  const segments = report.marks.map((mark, index) => {
    const previous = index === 0 ? report.start : report.marks[index - 1].at
    const diffMs = Number(mark.at - previous) / 1_000_000
    return `${mark.label}:${diffMs.toFixed(2)}ms`
  })

  const lastMark = report.marks.at(-1)?.at ?? report.start
  const totalMs = Number(lastMark - report.start) / 1_000_000

  return { totalMs, segments }
}

function getErrorMessage(error: unknown) {
  if (!error) return ""
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
