"use server"

import prisma from "@/lib/prisma"
import { checkRole } from "@/lib/roles"
import {
  EMAIL_PARAGRAPH_STYLE,
  renderEmailMarkdown,
} from "@/lib/email/markdown"
import {
  fetchAllNovuSubscriberEmails,
  isNovuEnabled,
} from "@/lib/server/notifications/novu"
import { sendSystemUpdateNotification } from "@/lib/server/notifications/novuAdmin"

export type NotificationSegment = "all" | "selected"

type SendNotificationError = {
  error: string
  invalidEmails?: string[]
}

type SendNotificationSuccess = {
  success: true
  summary: {
    totalRecipients: number
    attempted: number
    sent: number
    failed: { email: string; error: string }[]
    invalidEmails: string[]
    sentPercentage: number
    failedPercentage: number
  }
}

export type SendNotificationResponse =
  | SendNotificationError
  | SendNotificationSuccess

type ResolvedRecipient = {
  subscriberId: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

const RESEND_RATE_LIMIT_PER_SECOND = 2
const RESEND_WINDOW_MS = 1000

async function throttleResendRate(state: {
  count: number
  windowStart: number
}): Promise<{ count: number; windowStart: number }> {
  const now = Date.now()
  const elapsed = now - state.windowStart

  if (elapsed >= RESEND_WINDOW_MS) {
    return { count: 1, windowStart: now }
  }

  if (state.count >= RESEND_RATE_LIMIT_PER_SECOND) {
    const waitMs = RESEND_WINDOW_MS - elapsed
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return { count: 1, windowStart: Date.now() }
  }

  return { count: state.count + 1, windowStart: state.windowStart }
}

async function getSubscribedNewsletterEmails(): Promise<Set<string>> {
  if (!isNovuEnabled()) {
    return new Set()
  }

  try {
    const emails = await fetchAllNovuSubscriberEmails()
    return new Set(emails.map((email) => email.toLowerCase()))
  } catch (error) {
    console.error("Failed to load Novu subscribers", error)
    return new Set()
  }
}

async function buildBroadcastHtml(message: string): Promise<string> {
  const content = renderEmailMarkdown(message)
  const { renderToStaticMarkup } = await import("react-dom/server")

  const element = (
    <>
      {content ? (
        content
      ) : (
        <p style={EMAIL_PARAGRAPH_STYLE}>
          Start typing a message to see the preview.
        </p>
      )}
    </>
  )

  const html = renderToStaticMarkup(element)
  return html
    .replace(/\snode="[^"]*"/g, "")
    .replace(/>\s+</g, "><")
    .trim()
}

async function requireAdmin() {
  const isAdmin = await checkRole("admin")
  if (!isAdmin) {
    throw new Error("Unauthorized")
  }
}

export type NotificationUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  clerkId: string | null
}

export async function getNotificationUsers(): Promise<NotificationUser[]> {
  await requireAdmin()

  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      clerkId: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return users
}

function toRecipient(
  user: {
    email: string | null
    firstName: string | null
    lastName: string | null
    clerkId: string | null
  },
  subscribedEmails: Set<string> | null,
): ResolvedRecipient | null {
  const email = user.email?.trim().toLowerCase()
  if (!email) {
    return null
  }

  if (subscribedEmails && !subscribedEmails.has(email)) {
    return null
  }

  const subscriberId = user.clerkId?.trim() || email
  if (!subscriberId) {
    return null
  }

  return {
    subscriberId,
    email,
    firstName: user.firstName,
    lastName: user.lastName,
  }
}

async function resolveSegmentRecipients(
  segment: NotificationSegment,
  selectedUserIds: string[],
  limit?: number,
): Promise<{ recipients: ResolvedRecipient[]; invalidEmails: string[] }> {
  const take = typeof limit === "number" ? limit : undefined

  if (segment === "selected") {
    if (selectedUserIds.length === 0) {
      return { recipients: [], invalidEmails: [] }
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: selectedUserIds },
        status: "active",
      },
      select: { email: true, firstName: true, lastName: true, clerkId: true },
      take,
    })

    const recipients: ResolvedRecipient[] = []
    const invalidEmails: string[] = []

    for (const user of users) {
      const recipient = toRecipient(user, null)
      if (recipient) {
        recipients.push(recipient)
      } else if (user.email) {
        invalidEmails.push(user.email)
      }
    }

    return { recipients, invalidEmails }
  }

  const subscribedEmails = await getSubscribedNewsletterEmails()

  if (subscribedEmails.size === 0) {
    return { recipients: [], invalidEmails: [] }
  }

  const emailFilter = {
    email: {
      in: Array.from(subscribedEmails),
      mode: "insensitive" as const,
    },
  }

  const where = {
    status: "active",
    role: { not: "admin" as const },
    ...emailFilter,
  }

  const users = await prisma.user.findMany({
    where,
    select: { email: true, firstName: true, lastName: true, clerkId: true },
    orderBy: { createdAt: "asc" },
    take,
  })

  const recipients = users
    .map((user: (typeof users)[number]) => toRecipient(user, subscribedEmails))
    .filter(Boolean) as ResolvedRecipient[]

  return { recipients, invalidEmails: [] }
}

export async function sendNotificationEmailsAction(
  formData: FormData,
): Promise<SendNotificationResponse> {
  await requireAdmin()

  const segment = formData.get("segment") as NotificationSegment
  const subject = formData.get("subject")?.toString() ?? ""
  const message = formData.get("message")?.toString() ?? ""

  if (!isNovuEnabled()) {
    return { error: "Novu is not configured. Cannot send system update." }
  }

  const segments: NotificationSegment[] = ["all", "selected"]

  if (!segments.includes(segment)) {
    return { error: "Invalid segment selected" }
  }

  if (segment === "selected") {
    const userIds = formData.getAll("selectedUserIds").map(String)
    if (userIds.length === 0) {
      return {
        error: "Choose at least one member",
      }
    }
  }

  const selectedUserIds =
    segment === "selected" ? formData.getAll("selectedUserIds").map(String) : []

  const html = await buildBroadcastHtml(message)
  const timestamp = new Date().toISOString()

  let recipients: ResolvedRecipient[] = []
  let invalidEmails: string[] = []

  try {
    const resolution = await resolveSegmentRecipients(segment, selectedUserIds)
    recipients = resolution.recipients
    invalidEmails = resolution.invalidEmails
  } catch (error) {
    console.error("Failed to resolve recipients", error)
    return { error: "Failed to resolve recipients for the selected segment" }
  }

  const uniqueRecipientsMap = new Map<string, ResolvedRecipient>()
  for (const recipient of recipients) {
    const key =
      recipient.subscriberId?.toLowerCase() ?? recipient.email.toLowerCase()
    if (!uniqueRecipientsMap.has(key)) {
      uniqueRecipientsMap.set(key, recipient)
    }
  }

  const uniqueRecipients = Array.from(uniqueRecipientsMap.values())

  if (uniqueRecipients.length === 0) {
    return {
      error: "No recipients found for the selected segment",
      invalidEmails,
    }
  }

  const failed: { email: string; error: string }[] = []
  let sent = 0
  let rateLimitState = { count: 0, windowStart: Date.now() }

  for (const [index, recipient] of uniqueRecipients.entries()) {
    try {
      rateLimitState = await throttleResendRate(rateLimitState)
      const transactionId = `system_update:${segment}:${recipient.subscriberId}:${index}`
      const result = await sendSystemUpdateNotification({
        recipient,
        payload: {
          subject,
          html,
          segment,
          tags: ["system-updates", "broadcast"],
        },
        transactionId: `${transactionId}:${timestamp}`,
      })

      if (result.sent) {
        sent += 1
      } else {
        failed.push({
          email: recipient.email,
          error:
            result.reason === "novu-disabled"
              ? "Novu disabled"
              : result.reason === "missing-workflow"
                ? "Admin broadcast workflow not configured"
                : "Failed to trigger Novu workflow",
        })
      }
    } catch (error: any) {
      console.error(
        `Failed to send admin notification to ${recipient.email}`,
        error,
      )
      failed.push({
        email: recipient.email,
        error: error?.message ?? "Unknown error",
      })
    }
  }

  if (sent === 0) {
    return {
      error: "Failed to send notification emails",
      invalidEmails,
    }
  }

  return {
    success: true,
    summary: {
      totalRecipients: uniqueRecipients.length,
      attempted: uniqueRecipients.length,
      sent,
      failed,
      invalidEmails,
      sentPercentage: calculatePercentage(sent, uniqueRecipients.length),
      failedPercentage: calculatePercentage(
        failed.length,
        uniqueRecipients.length,
      ),
    },
  }
}
export async function getSegmentPreviewRecipient(params: {
  segment: NotificationSegment
  selectedUserIds?: string[]
}): Promise<{ email: string; firstName: string | null } | null> {
  try {
    await requireAdmin()
  } catch {
    return null
  }

  const { segment, selectedUserIds } = params

  if (segment === "selected") {
    const ids = selectedUserIds ?? []
    if (ids.length === 0) {
      return null
    }
    const recipients = await resolveSegmentRecipients(segment, ids, 1)
    const recipient = recipients.recipients[0]
    if (!recipient) {
      return null
    }
    return {
      email: recipient.email,
      firstName: recipient.firstName ?? null,
    }
  }

  const recipients = await resolveSegmentRecipients(segment, [], 1)

  const recipient = recipients.recipients[0]
  if (!recipient) {
    return null
  }

  return {
    email: recipient.email,
    firstName: recipient.firstName ?? null,
  }
}

function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}
