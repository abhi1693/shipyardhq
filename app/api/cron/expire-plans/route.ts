import { NextResponse } from "next/server"
import { expireBoostedPlans } from "@/lib/server/planExpiration"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization") || ""
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

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
