"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { randomUUID } from "crypto"
import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"
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

    const voteId = randomUUID()

    const rows = await prisma.$queryRaw<
      {
        upvotes: number | bigint | null
        upvoted: boolean
        delta: number | bigint | null
      }[]
    >`
      WITH deleted AS (
        DELETE FROM "ProductUpvote"
        WHERE "productId" = ${productId} AND "userId" = ${user.id}
        RETURNING 1
      ),
      inserted AS (
        INSERT INTO "ProductUpvote" ("id", "productId", "userId")
        SELECT ${voteId}, ${productId}, ${user.id}
        WHERE NOT EXISTS (SELECT 1 FROM deleted)
        RETURNING 1
      ),
      delta AS (
        SELECT
          COALESCE((SELECT COUNT(*) FROM inserted), 0) AS inserted_count,
          COALESCE((SELECT COUNT(*) FROM deleted), 0) AS deleted_count
      ),
      updated AS (
        UPDATE "ProductAnalytics"
        SET "upvotes" = GREATEST(
          "ProductAnalytics"."upvotes" + (
            (SELECT inserted_count FROM delta) - (SELECT deleted_count FROM delta)
          ),
          0
        )
        WHERE "productId" = ${productId}
        RETURNING "upvotes"
      ),
      created AS (
        INSERT INTO "ProductAnalytics" ("productId", "upvotes", "clicks")
        SELECT ${productId},
          CASE
            WHEN (SELECT inserted_count - deleted_count FROM delta) > 0 THEN 1
            ELSE 0
          END,
          0
        WHERE NOT EXISTS (SELECT 1 FROM updated)
        RETURNING "upvotes"
      ),
      result AS (
        SELECT
          ((SELECT inserted_count FROM delta) > 0) AS upvoted,
          (SELECT inserted_count - deleted_count FROM delta) AS delta,
          COALESCE(
            (SELECT "upvotes" FROM updated),
            (SELECT "upvotes" FROM created)
          ) AS upvotes
      )
      SELECT upvoted, delta, upvotes FROM result;
    `

    txMark("toggle_query")
    transactionReport = txReport

    const row = rows[0]
    if (!row) {
      mark("transaction")
      revalidateProduct(productId)
      mark("revalidate_product")
      revalidateLeaderboard()
      mark("revalidate_leaderboard")
      finalize("success", { transaction: transactionReport })
      return _prevState
    }

    const delta = Number(row.delta ?? 0)
    const upvoted = delta > 0 ? true : Boolean(row.upvoted)
    const upvotes = Number(row.upvotes ?? _prevState.upvotes)

    mark("transaction")

    revalidateProduct(productId)
    mark("revalidate_product")

    revalidateLeaderboard()
    mark("revalidate_leaderboard")

    finalize("success", { transaction: transactionReport })
    return { upvotes, upvoted }
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

  console.log(parts.join(" "))
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
