import { siteConfig } from "@/lib/siteConfig"
import { sendEmail } from "@/lib/email/resend"
import { getAppBaseUrl } from "@/lib/email/utils"
import {
  buildLinkedInAuthRequest,
  getLinkedInAuthStatus,
} from "@/lib/server/social/linkedinAuth"

const MIN_NOTIFY_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

let lastNotifiedAt: number | null = null

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

  const now = Date.now()
  if (!options.force && lastNotifiedAt) {
    const elapsed = now - lastNotifiedAt
    if (elapsed < MIN_NOTIFY_INTERVAL_MS) {
      return { sent: false, reason: "throttled" }
    }
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
    lastNotifiedAt = now
    return { sent: true, adminEmail, authUrl }
  } catch (error) {
    console.error("[linkedin] failed to send auth email", error)
    return { sent: false, reason: "email-failed" }
  }
}
