import { NextResponse } from "next/server"

import { refreshProductPlanGrantCachesForProducts } from "@/lib/server/productPlanGrantCache"

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const authorization = request.headers.get("authorization")?.trim()
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null
  return token === secret
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "refresh not configured" },
      { status: 503 },
    )
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    productIds?: unknown
    reason?: unknown
  } | null
  const productIds = Array.isArray(body?.productIds)
    ? body.productIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 500)
    : []
  if (!productIds.length) {
    return NextResponse.json({ error: "productIds required" }, { status: 400 })
  }
  const reason =
    typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 120)
      : "worker"

  await refreshProductPlanGrantCachesForProducts(productIds, reason)
  return NextResponse.json({ success: true, productCount: productIds.length })
}
