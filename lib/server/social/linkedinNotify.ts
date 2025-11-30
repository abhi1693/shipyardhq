import { siteConfig } from "@/lib/siteConfig"
import { sendEmail } from "@/lib/email/resend"
import { getAppBaseUrl } from "@/lib/email/utils"
import {
  buildLinkedInAuthRequest,
  getLinkedInAuthStatus,
} from "@/lib/server/social/linkedinAuth"
import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"

const MIN_NOTIFY_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes
const NOTIFY_THROTTLE_KEY = buildCacheKey("linkedin", "auth-notify", "last")
const notifyFallback: { last?: number } = {}

type NotifyResult =
  | { sent: true; adminEmail: string; authUrl: string }
  | {
      sent: false
      reason:
        | "missing-admin-email"
        | "token-present"
        | "throttled"
        | "email-failed"
    }

type NotifyOptions = {
  trigger?: string
  force?: boolean
}

async function shouldThrottle(): Promise<boolean> {
  const client = await getRedisClient().catch(() => null)
  if (client) {
    try {
      const existing = await client.get(NOTIFY_THROTTLE_KEY)
      return Boolean(existing)
    } catch (error) {
      console.warn("[linkedin] failed to read notify throttle key", { error })
    }
  }

  const last = notifyFallback.last
  if (typeof last === "number") {
    const now = Date.now()
    if (now - last < MIN_NOTIFY_INTERVAL_MS) {
      return true
    }
  }

  return false
}

async function recordNotificationTimestamp() {
  const client = await getRedisClient().catch(() => null)
  const ttlSeconds = Math.ceil(MIN_NOTIFY_INTERVAL_MS / 1000)

  if (client) {
    try {
      await client.set(NOTIFY_THROTTLE_KEY, Date.now().toString(), {
        EX: ttlSeconds,
      })
      return
    } catch (error) {
      console.warn("[linkedin] failed to store notify throttle key", { error })
    }
  }

  notifyFallback.last = Date.now()
}

export async function notifyLinkedInAuthNeeded(
  options: NotifyOptions = {},
): Promise<NotifyResult> {
  const adminEmail = siteConfig.adminEmail?.trim()
  if (!adminEmail) {
    return { sent: false, reason: "missing-admin-email" }
  }

  const baseUrl = getAppBaseUrl()
  const status = await getLinkedInAuthStatus({ baseUrl })

  if (status.hasAccessToken && !options.force) {
    return { sent: false, reason: "token-present" }
  }

  if (!options.force && (await shouldThrottle())) {
    return { sent: false, reason: "throttled" }
  }

  const { authUrl } = await buildLinkedInAuthRequest(baseUrl)
  const lines = [
    "LinkedIn access token is missing or expired.",
    options.trigger ? `Trigger: ${options.trigger}` : null,
    "",
    "Open this URL to approve access:",
    authUrl,
    "",
    `Site: ${siteConfig.name} (${siteConfig.url})`,
  ].filter(Boolean) as string[]

  try {
    await sendEmail({
      to: [adminEmail],
      subject: "LinkedIn OAuth approval needed",
      text: lines.join("\n"),
    })
    await recordNotificationTimestamp()
    return { sent: true, adminEmail, authUrl }
  } catch (error) {
    console.error("[linkedin] failed to send auth email", error)
    return { sent: false, reason: "email-failed" }
  }
}
