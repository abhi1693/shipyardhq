import { NextResponse } from "next/server"

import { runPlacementScheduler } from "@/lib/server/points/placementScheduler"

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
    const result = await runPlacementScheduler()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron] placement scheduler failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to run placement scheduler",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
