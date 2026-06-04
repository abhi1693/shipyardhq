import { NextResponse } from "next/server"

import { getHomepageFeedPage } from "@/actions/public/homepage/feed"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"

function normalizePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = normalizePositiveInteger(url.searchParams.get("page"), 1)
  const pageSize = normalizePositiveInteger(
    url.searchParams.get("pageSize"),
    HOMEPAGE_FEED_PAGE_SIZE,
  )

  try {
    const result = await getHomepageFeedPage({
      page,
      pageSize,
      view: DEFAULT_HOMEPAGE_FEED_VIEW,
    })

    return NextResponse.json(result, {
      headers: {
        "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("[homepage] failed to fetch feed page", error)
    return NextResponse.json(
      {
        items: [],
        page,
        pageSize,
        hasMore: false,
        nextPage: null,
      },
      { status: 200 },
    )
  }
}
