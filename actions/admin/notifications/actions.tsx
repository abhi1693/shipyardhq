"use server"

import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"
import { checkRole } from "@/lib/roles"
import {
  EMAIL_PARAGRAPH_STYLE,
  getEmailPreviewText,
  markdownToPlainText,
  renderEmailMarkdown,
} from "@/lib/email/markdown"
import {
  fetchAllNovuSubscriberEmails,
  isNovuEnabled,
} from "@/lib/server/notifications/novu"

const BUILDER_INTENTS = ["launch-product", "manage-team"] as const
const EXPLORER_INTENT = "explore" as const

export type NotificationSegment =
  | "registered"
  | "builders"
  | "explorers"
  | "withProducts"
  | "withoutProducts"
  | "buildersWithProducts"
  | "buildersWithoutProducts"
  | "explorersWithoutProducts"
  | "selected"

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

const DEFAULT_GREETING = "shipmate"
const RATE_LIMIT_REQUESTS_PER_SECOND = 2
const RATE_LIMIT_INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT_REQUESTS_PER_SECOND)

type ResolvedRecipient = {
  email: string
  firstName?: string | null
}

async function getSubscribedNewsletterEmails(): Promise<string[]> {
  if (!isNovuEnabled()) {
    return []
  }

  try {
    return await fetchAllNovuSubscriberEmails()
  } catch (error) {
    console.error("Failed to load Novu subscribers", error)
    return []
  }
}

function getGreetingName(recipient: ResolvedRecipient): string {
  const explicit = recipient.firstName?.trim()
  if (explicit) {
    return explicit
  }
  return deriveFirstNameFromEmail(recipient.email) ?? DEFAULT_GREETING
}

function buildNotificationEmail(
  subject: string,
  message: string,
  recipient: ResolvedRecipient,
) {
  const trimmed = message.trim()
  const previewText = getEmailPreviewText(trimmed)
  const markdownContent = renderEmailMarkdown(trimmed)
  const greetingName = getGreetingName(recipient)

  return (
    <BaseEmailTemplate
      previewText={previewText}
      title={subject || "Shipyard HQ"}
      footerNote={<Signature />}
    >
      <p style={EMAIL_PARAGRAPH_STYLE}>Dear {greetingName},</p>
      {markdownContent}
    </BaseEmailTemplate>
  )
}

function buildTextBody(message: string, recipient: ResolvedRecipient) {
  const greetingName = getGreetingName(recipient)
  const trimmed = markdownToPlainText(message)
  const lines = [`Dear ${greetingName},`]

  if (trimmed) {
    lines.push("", trimmed)
  }

  lines.push(
    "",
    "Wishing you fair winds,",
    "Shipyard Crew",
    "https://shipyardhq.dev",
  )

  return lines.join("\n")
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
}

export async function getNotificationUsers(): Promise<NotificationUser[]> {
  await requireAdmin()

  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, email: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return users
}

async function resolveSegmentRecipients(
  segment: NotificationSegment,
  selectedUserIds: string[],
  limit?: number,
): Promise<ResolvedRecipient[]> {
  const take = typeof limit === "number" ? limit : undefined

  if (segment === "selected") {
    if (selectedUserIds.length === 0) {
      return []
    }
    const users = await prisma.user.findMany({
      where: {
        id: { in: selectedUserIds },
        status: "active",
      },
      select: { email: true, firstName: true },
      take,
    })
    return users.map((user: (typeof users)[number]) => ({
      email: user.email,
      firstName: user.firstName,
    }))
  }

  const subscribedEmails = await getSubscribedNewsletterEmails()

  if (subscribedEmails.length === 0) {
    return []
  }

  const emailFilter = {
    email: { in: subscribedEmails, mode: "insensitive" as const },
  }

  switch (segment) {
    case "registered": {
      const users = await prisma.user.findMany({
        where: { status: "active", role: { not: "admin" }, ...emailFilter },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "builders": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          roleIntent: { in: [...BUILDER_INTENTS] },
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "buildersWithProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          roleIntent: { in: [...BUILDER_INTENTS] },
          products: { some: {} },
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "buildersWithoutProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          roleIntent: { in: [...BUILDER_INTENTS] },
          products: { none: {} },
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "explorers": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          roleIntent: EXPLORER_INTENT,
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "explorersWithoutProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          roleIntent: EXPLORER_INTENT,
          products: { none: {} },
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "withProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          products: { some: {} },
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "withoutProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: { not: "admin" },
          products: { none: {} },
          ...emailFilter,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user: (typeof users)[number]) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    default: {
      return []
    }
  }
}

export async function sendNotificationEmailsAction(
  formData: FormData,
): Promise<SendNotificationResponse> {
  try {
    await requireAdmin()
  } catch {
    return { error: "Unauthorized" }
  }

  const segment = formData.get("segment")?.toString() as
    | NotificationSegment
    | undefined
  const subject = formData.get("subject")?.toString().trim()
  const message = formData.get("message")?.toString().trim()
  const selectedUserIds = formData
    .getAll("selectedUserIds")
    .map((value) => value.toString())

  if (!segment) {
    return { error: "Please select a recipient segment" }
  }

  if (!subject) {
    return { error: "Subject is required" }
  }

  if (!message) {
    return { error: "Message is required" }
  }

  const segments: NotificationSegment[] = [
    "registered",
    "builders",
    "explorers",
    "withProducts",
    "withoutProducts",
    "buildersWithProducts",
    "buildersWithoutProducts",
    "explorersWithoutProducts",
    "selected",
  ]

  if (!segments.includes(segment)) {
    return { error: "Invalid segment selected" }
  }

  if (segment === "selected" && selectedUserIds.length === 0) {
    return {
      error: "Choose at least one member",
    }
  }

  let recipients: ResolvedRecipient[] = []

  try {
    recipients = await resolveSegmentRecipients(segment, selectedUserIds)
  } catch (error) {
    console.error("Failed to resolve recipients", error)
    return { error: "Failed to resolve recipients for the selected segment" }
  }

  const uniqueRecipientsMap = new Map<string, ResolvedRecipient>()
  for (const recipient of recipients) {
    const key = recipient.email.toLowerCase()
    if (!uniqueRecipientsMap.has(key)) {
      uniqueRecipientsMap.set(key, recipient)
    }
  }

  const uniqueRecipients = Array.from(uniqueRecipientsMap.values())

  if (uniqueRecipients.length === 0) {
    return { error: "No recipients found for the selected segment" }
  }

  const failed: { email: string; error: string }[] = []
  let sent = 0

  for (const [index, recipient] of uniqueRecipients.entries()) {
    if (index > 0) {
      await wait(RATE_LIMIT_INTERVAL_MS)
    }
    try {
      await sendEmail({
        to: recipient.email,
        subject,
        text: buildTextBody(message, recipient),
        react: buildNotificationEmail(subject, message, recipient),
      })
      sent += 1
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
    }
  }

  return {
    success: true,
    summary: {
      totalRecipients: uniqueRecipients.length,
      attempted: uniqueRecipients.length,
      sent,
      failed,
      invalidEmails: [],
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
    const recipient = recipients[0]
    if (!recipient) {
      return null
    }
    return {
      email: recipient.email,
      firstName: recipient.firstName ?? null,
    }
  }

  const recipients = await resolveSegmentRecipients(segment, [], 1)

  const recipient = recipients[0]
  if (!recipient) {
    return null
  }

  return {
    email: recipient.email,
    firstName: recipient.firstName ?? null,
  }
}

function Signature() {
  return (
    <div style={{ marginTop: "24px" }}>
      <p style={EMAIL_PARAGRAPH_STYLE}>Wishing you fair winds,</p>
      <p style={EMAIL_PARAGRAPH_STYLE}>
        Shipyard Crew
        <br />
        <a
          href="https://shipyardhq.dev"
          style={{ color: "#2563eb", textDecoration: "none" }}
        >
          shipyardhq.dev
        </a>
      </p>
    </div>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}
