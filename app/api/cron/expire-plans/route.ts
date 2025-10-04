import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { expireBoostedPlans } from "@/lib/server/planExpiration"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    const result = await expireBoostedPlans()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed" },
      { status: 500 },
    )
  }
}
