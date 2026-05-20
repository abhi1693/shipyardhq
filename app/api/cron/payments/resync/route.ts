import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  console.info("[cron.payments:resync] skipped; payment connectors deprecated")

  return NextResponse.json({
    success: true,
    deprecated: true,
    enqueued: 0,
  })
}
