import { NextResponse } from "next/server"

import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"

export const dynamic = "force-dynamic"

function getRefreshSecret() {
  return (
    process.env.HOMEPAGE_REFRESH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  )
}

function isAuthorized(request: Request) {
  const secret = getRefreshSecret()
  if (!secret) return false

  const authorization = request.headers.get("authorization")?.trim()
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : request.headers.get("x-homepage-refresh-secret")?.trim()

  return token === secret
}

async function handleRefresh(request: Request) {
  if (!getRefreshSecret()) {
    console.error("[homepage.refresh] missing refresh secret")
    return NextResponse.json(
      { error: "Homepage refresh is not configured" },
      { status: 503 },
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await refreshHomepageFeedCache()
    return NextResponse.json(result, {
      headers: {
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    console.error("[homepage.refresh] failed", { error })
    return NextResponse.json(
      { error: "Failed to refresh homepage feed" },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handleRefresh(request)
}

export async function POST(request: Request) {
  return handleRefresh(request)
}
