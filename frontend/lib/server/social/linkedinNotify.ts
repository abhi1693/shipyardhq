import { siteConfig } from "@/lib/siteConfig"
import { getAppBaseUrl } from "@/lib/email/utils"
import prisma from "@/lib/prisma"
import {
  buildLinkedInAuthRequest,
  getLinkedInAuthStatus,
} from "@/lib/server/social/linkedinAuth"
import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { sendSystemUpdateNotification } from "@/lib/server/notifications/novuAdmin"

const MIN_NOTIFY_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes
const NOTIFY_THROTTLE_KEY = buildCacheKey("linkedin", "auth-notify", "last")
const notifyFallback: { last?: number } = {}

type NotifyResult =
  | { sent: true; adminEmail: string; authUrl: string }
  | {
      sent: false
      reason:
        | "missing-admin-email"
        | "missing-admin-user"
        | "missing-admin-clerk-id"
        | "token-present"
        | "throttled"
        | "email-failed"
    }

type NotifyOptions = {
  trigger?: string
  force?: boolean
  context?: {
    status?: number
    reason?: string
    detail?: string
  }
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

  const adminUser = await prisma.user.findFirst({
    where: { email: { equals: adminEmail, mode: "insensitive" } },
    select: { clerkId: true, email: true, firstName: true, lastName: true },
  })

  if (!adminUser) {
    return { sent: false, reason: "missing-admin-user" }
  }

  const adminClerkId = adminUser.clerkId?.trim()
  if (!adminClerkId) {
    return { sent: false, reason: "missing-admin-clerk-id" }
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
  const detail = options.context?.detail?.trim()
  const lines = [
    "LinkedIn OAuth approval may be required (missing/expired/revoked, or lacking posting permissions).",
    options.trigger ? `Trigger: ${options.trigger}` : null,
    typeof options.context?.status === "number"
      ? `Status: ${options.context.status}`
      : null,
    options.context?.reason ? `Reason: ${options.context.reason}` : null,
    detail ? `Detail: ${detail}` : null,
    "",
    "Open this URL to approve access:",
    authUrl,
    "",
    `Site: ${siteConfig.name} (${siteConfig.url})`,
  ].filter(Boolean) as string[]

  try {
    await sendSystemUpdateNotification({
      recipient: {
        subscriberId: adminClerkId,
        email: adminEmail,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
      },
      payload: {
        subject: "LinkedIn OAuth approval needed",
        html: lines
          .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
          .join(""),
        segment: "ops",
        tags: ["system-updates", "ops", "linkedin"],
      },
      transactionId: `system_update:linkedin_auth_alert:${options.trigger ?? "unknown"}`,
    })
    await recordNotificationTimestamp()
    return { sent: true, adminEmail, authUrl }
  } catch (error) {
    console.error("[novu] failed to send LinkedIn auth alert", error)
    return { sent: false, reason: "email-failed" }
  }
}
