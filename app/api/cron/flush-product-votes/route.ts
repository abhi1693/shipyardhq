import { NextResponse } from "next/server"

import { revalidateLeaderboard, revalidateProduct } from "@/lib/cache/revalidate"
import { flushPendingVotesToDatabase } from "@/lib/server/productVotesStore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const authHeader = request.headers.get("authorization") || ""
  return authHeader === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await flushPendingVotesToDatabase()

    if (result.processedProductIds.length) {
      for (const productId of result.processedProductIds) {
        revalidateProduct(productId)
      }
      revalidateLeaderboard()
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron] flush product votes failed", error)
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to flush votes" },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
