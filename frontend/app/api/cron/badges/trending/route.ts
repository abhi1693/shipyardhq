import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { dispatchEventAsync } from "@/lib/server/events"
import { computeLeaderboardWindow } from "@/lib/server/leaderboard/v2"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HOUR_MS = 60 * 60 * 1000
const DEFAULT_CURRENT_WINDOW_HOURS = 6
const DEFAULT_PREVIOUS_WINDOW_HOURS = 6
const DEFAULT_MIN_SCORE = 5
const DEFAULT_MIN_RATIO = 1.5
const DEFAULT_LIMIT = 1
const TRENDING_TTL_MS = 12 * HOUR_MS

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const now = new Date()
  const currentWindowHours =
    Number.parseInt(url.searchParams.get("currentHours") || "", 10) ||
    DEFAULT_CURRENT_WINDOW_HOURS
  const previousWindowHours =
    Number.parseInt(url.searchParams.get("previousHours") || "", 10) ||
    DEFAULT_PREVIOUS_WINDOW_HOURS
  const minScore =
    Number.parseInt(url.searchParams.get("minScore") || "", 10) ||
    DEFAULT_MIN_SCORE
  const minRatio =
    Number.parseFloat(url.searchParams.get("minRatio") || "") ||
    DEFAULT_MIN_RATIO
  const limit =
    Number.parseInt(url.searchParams.get("limit") || "", 10) || DEFAULT_LIMIT

  const currentStart = new Date(now.getTime() - currentWindowHours * HOUR_MS)
  const previousStart = new Date(
    currentStart.getTime() - previousWindowHours * HOUR_MS,
  )
  const previousEnd = currentStart

  const [currentScores, previousScores] = await Promise.all([
    computeLeaderboardWindow({
      periodStart: currentStart,
      periodEnd: now,
      asOf: now,
      limit,
    }),
    computeLeaderboardWindow({
      periodStart: previousStart,
      periodEnd: previousEnd,
      asOf: previousEnd,
      limit: limit * 2,
    }),
  ])

  const previousMap = new Map<string, number>()
  for (const row of previousScores) {
    previousMap.set(row.productId, row.score)
  }

  const candidates = currentScores.filter((row) => {
    const prev = previousMap.get(row.productId) ?? 0
    const ratio = prev > 0 ? row.score / prev : row.score > 0 ? row.score : 0
    return row.score >= minScore && ratio >= minRatio
  })

  const assigned: Array<{ productId: string; badgeId: string }> = []
  let remaining = limit

  for (const row of candidates) {
    if (remaining <= 0) break

    const product = await prisma.product.findUnique({
      where: { id: row.productId },
      select: { id: true, status: true },
    })
    if (!product || product.status !== "published") continue

    const activeTrending = await prisma.productBadge.findFirst({
      where: {
        productId: product.id,
        badge: "trending",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })
    if (activeTrending) continue

    const expiresAt = new Date(now.getTime() + TRENDING_TTL_MS)
    const badge = await prisma.productBadge.create({
      data: {
        productId: product.id,
        badge: "trending",
        expiresAt,
      },
    })

    dispatchEventAsync(
      "badge.assigned",
      {
        id: badge.id,
        productId: product.id,
        badge: "trending",
        expiresAt,
      },
      { context: { reason: "auto-trending" } },
    )

    assigned.push({ productId: product.id, badgeId: badge.id })
    remaining -= 1
  }

  return NextResponse.json({
    success: true,
    assignedCount: assigned.length,
    candidatesChecked: candidates.length,
    params: {
      currentWindowHours,
      previousWindowHours,
      minScore,
      minRatio,
      limit,
    },
  })
}
