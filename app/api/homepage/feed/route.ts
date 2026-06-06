import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import {
  getHomepageFeedPage,
  getHomepageViewerUpvotedProductIds,
  type HomepageFeedPageResult,
} from "@/actions/public/homepage/feed"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"

function normalizePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

async function applyViewerVoteState(result: HomepageFeedPageResult): Promise<{
  result: HomepageFeedPageResult
  isPersonalized: boolean
}> {
  const { userId } = await auth()
  if (!userId || result.items.length === 0) {
    return { result, isPersonalized: false }
  }

  const votedIds = new Set(
    await getHomepageViewerUpvotedProductIds({
      clerkUserId: userId,
      productIds: result.items.map((item) => item.id),
    }),
  )

  return {
    result: {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        isVoted: votedIds.has(item.id),
      })),
    },
    isPersonalized: true,
  }
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
      launchWindow: "week",
    })
    const personalized = await applyViewerVoteState(result)

    return NextResponse.json(personalized.result, {
      headers: {
        "cache-control": personalized.isPersonalized
          ? "private, no-store"
          : "public, s-maxage=60, stale-while-revalidate=300",
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
