import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { refreshProductInterestCache } from "@/lib/server/analytics/productInterest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const url = new URL(request.url)
  const days = Number.parseInt(url.searchParams.get("days") || "", 10) || 7
  const topLimit =
    Number.parseInt(url.searchParams.get("topLimit") || "", 10) || 60
  const perCategoryLimit =
    Number.parseInt(url.searchParams.get("perCategoryLimit") || "", 10) || 60
  const alsoClickedLimit =
    Number.parseInt(url.searchParams.get("alsoClickedLimit") || "", 10) || 12
  const skipAlsoClicked = url.searchParams.get("skipAlsoClicked") !== "false"

  const result = await refreshProductInterestCache({
    days,
    topLimit,
    perCategoryLimit,
    alsoClickedLimit,
    skipAlsoClicked,
  })

  return NextResponse.json({
    days,
    topLimit,
    perCategoryLimit,
    alsoClickedLimit,
    skipAlsoClicked,
    ...result,
  })
}
