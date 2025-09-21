"use server"

import { Fragment } from "react"
import { auth } from "@clerk/nextjs/server"

import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"

const BUILDER_INTENTS = ["launch-product", "manage-team"] as const
const EXPLORER_INTENT = "explore" as const

export type NotificationSegment =
  | "registered"
  | "builders"
  | "explorers"
  | "withProducts"
  | "withoutProducts"
  | "selected"

export type SegmentCounts = {
  registered: number
  builders: number
  explorers: number
  withProducts: number
  withoutProducts: number
}

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

const emailParagraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const DEFAULT_GREETING = "shipmate"
const RATE_LIMIT_REQUESTS_PER_SECOND = 2
const RATE_LIMIT_INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT_REQUESTS_PER_SECOND)

type ResolvedRecipient = {
  email: string
  firstName?: string | null
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
  const previewText = getPreviewText(trimmed)
  const paragraphs = trimmed
    ? trimmed.split(/\n{2,}/).map((block) => block.trim())
    : []
  const greetingName = getGreetingName(recipient)

  return (
    <BaseEmailTemplate
      previewText={previewText}
      title={subject || "Shipyard HQ"}
      footerNote={<Signature />}
    >
      <p style={emailParagraphStyle}>Dear {greetingName},</p>
      {paragraphs.map((paragraph, index) => (
        <p key={index} style={emailParagraphStyle}>
          {renderParagraphContent(paragraph, index)}
        </p>
      ))}
    </BaseEmailTemplate>
  )
}

function buildTextBody(message: string, recipient: ResolvedRecipient) {
  const greetingName = getGreetingName(recipient)
  const trimmed = message.trim()
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

function renderParagraphContent(paragraph: string, paragraphIndex: number) {
  const lines = paragraph.split(/\n/)

  return lines.map((line, lineIndex) => {
    const content = line.trim()

    return (
      <Fragment key={`${paragraphIndex}-${lineIndex}`}>
        {content}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </Fragment>
    )
  })
}

function getPreviewText(message: string): string | undefined {
  const collapsed = message.replace(/\s+/g, " ").trim()
  return collapsed ? collapsed.slice(0, 140) : undefined
}

async function requireAdmin() {
  const { userId, sessionClaims } = await auth()
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    throw new Error("Unauthorized")
  }
}

export async function getNotificationSegmentCounts(): Promise<SegmentCounts> {
  await requireAdmin()

  const [registered, builders, explorers, withProducts, withoutProducts] =
    await Promise.all([
      prisma.user.count({
        where: {
          status: "active",
        },
      }),
      prisma.user.count({
        where: {
          status: "active",
          roleIntent: { in: [...BUILDER_INTENTS] },
        },
      }),
      prisma.user.count({
        where: {
          status: "active",
          roleIntent: EXPLORER_INTENT,
        },
      }),
      prisma.user.count({
        where: {
          status: "active",
          products: { some: {} },
        },
      }),
      prisma.user.count({
        where: {
          status: "active",
          products: { none: {} },
        },
      }),
    ])

  return {
    registered,
    builders,
    explorers,
    withProducts,
    withoutProducts,
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
  switch (segment) {
    case "registered": {
      const users = await prisma.user.findMany({
        where: { status: "active" },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "builders": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          roleIntent: { in: [...BUILDER_INTENTS] },
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "explorers": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          roleIntent: EXPLORER_INTENT,
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "withProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          products: { some: {} },
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "withoutProducts": {
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          products: { none: {} },
        },
        select: { email: true, firstName: true },
        orderBy: { createdAt: "asc" },
        take,
      })
      return users.map((user) => ({
        email: user.email,
        firstName: user.firstName,
      }))
    }
    case "selected": {
      if (selectedUserIds.length === 0) {
        return []
      }
      const users = await prisma.user.findMany({
        where: {
          id: { in: selectedUserIds },
          status: "active",
        },
        select: { email: true, firstName: true },
      })
      return users.map((user) => ({
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
      <p style={emailParagraphStyle}>Wishing you fair winds,</p>
      <p style={emailParagraphStyle}>
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
