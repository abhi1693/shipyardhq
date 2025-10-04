import { NextResponse } from "next/server"

import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { flushPendingVotesToDatabase } from "@/lib/server/productVotesStore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

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
