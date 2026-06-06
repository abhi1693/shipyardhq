import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import { getHomepageViewerUpvotedProductIds } from "@/actions/public/homepage/feed"

const MAX_PRODUCT_IDS = 80

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json(
      { votedProductIds: [] },
      { headers: { "cache-control": "private, no-store" } },
    )
  }

  const payload = (await request.json().catch(() => ({}))) as {
    productIds?: unknown
  }
  const productIds = Array.isArray(payload.productIds)
    ? Array.from(
        new Set(
          payload.productIds
            .filter((id): id is string => typeof id === "string")
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ).slice(0, MAX_PRODUCT_IDS)
    : []

  if (!productIds.length) {
    return NextResponse.json(
      { votedProductIds: [] },
      { headers: { "cache-control": "private, no-store" } },
    )
  }

  const votedProductIds = await getHomepageViewerUpvotedProductIds({
    clerkUserId: userId,
    productIds,
  })

  return NextResponse.json(
    { votedProductIds },
    { headers: { "cache-control": "private, no-store" } },
  )
}
