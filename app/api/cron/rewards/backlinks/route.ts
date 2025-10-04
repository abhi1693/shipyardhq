import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import {
  BACKLINK_CRON_LOG_PREFIX,
  runBacklinkVerification,
} from "@/lib/server/rewards/backlinkVerification"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info(`${BACKLINK_CRON_LOG_PREFIX} starting verification run`)
    const result = await runBacklinkVerification()
    console.info(`${BACKLINK_CRON_LOG_PREFIX} verification completed`, result)
    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const errorPayload =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: "Unknown error" }
    console.error(
      `${BACKLINK_CRON_LOG_PREFIX} verification failed`,
      errorPayload,
    )
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
