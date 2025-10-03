import { NextResponse } from "next/server"

const AUTH_HEADER = "authorization"
const CRON_HEADER = "x-cron-secret"
const BEARER_PREFIX = "Bearer "

function isAuthorizedValue(received: string, secret: string) {
  if (!received) return false
  if (received === secret) return true
  return received === `${BEARER_PREFIX}${secret}`
}

export function ensureCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()

  if (!secret) {
    console.error("[cron] CRON_SECRET is missing or empty")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const authHeader = request.headers.get(AUTH_HEADER)?.trim() ?? ""
  if (isAuthorizedValue(authHeader, secret)) return null

  const cronHeader = request.headers.get(CRON_HEADER)?.trim() ?? ""
  if (isAuthorizedValue(cronHeader, secret)) return null

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
