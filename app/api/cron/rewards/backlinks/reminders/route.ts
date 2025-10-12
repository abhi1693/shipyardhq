import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import {
  BACKLINK_REMINDER_LOG_PREFIX,
  runBacklinkReminder,
} from "@/lib/server/rewards/backlinkReminder"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  try {
    console.info(`${BACKLINK_REMINDER_LOG_PREFIX} starting reminder run`)
    const result = await runBacklinkReminder()
    console.info(
      `${BACKLINK_REMINDER_LOG_PREFIX} reminder run completed`,
      result,
    )
    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const errorPayload =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: "Unknown error" }
    console.error(
      `${BACKLINK_REMINDER_LOG_PREFIX} reminder run failed`,
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
