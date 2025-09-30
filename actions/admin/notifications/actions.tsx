"use server"

import { renderAsync } from "@react-email/render"

import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/resend"
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"
import { parseEmailList } from "@/lib/email/list-parser"
import {
  BUILDER_OUTREACH_SUBJECT,
  BuilderOutreachEmail,
  buildBuilderOutreachTextBody,
} from "@/lib/email/templates/outreach/builderOutreach"
import { checkRole } from "@/lib/roles"
import {
  EMAIL_PARAGRAPH_STYLE,
  getEmailPreviewText,
  markdownToPlainText,
  renderEmailMarkdown,
} from "@/lib/email/markdown"

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

export type SegmentCounts = {
  registered: number
  builders: number
  explorers: number
  withProducts: number
  withoutProducts: number
  buildersWithProducts: number
  buildersWithoutProducts: number
  explorersWithoutProducts: number
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

export type SendBuilderOutreachResponse =
  | SendNotificationError
  | { success: true; summary: SendNotificationSuccess["summary"] }

const DEFAULT_GREETING = "shipmate"
const RATE_LIMIT_REQUESTS_PER_SECOND = 2
const RATE_LIMIT_INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT_REQUESTS_PER_SECOND)

type ResolvedRecipient = {
  email: string
  firstName?: string | null
}

async function getSubscribedNewsletterEmails(): Promise<string[]> {
  const subscriptions = await prisma.newsletterSubscription.findMany({
    select: { email: true },
  })

  if (!subscriptions.length) {
    return []
  }

  const normalized = new Set<string>()
  for (const entry of subscriptions) {
    const email = entry.email?.trim().toLowerCase()
    if (email) {
      normalized.add(email)
    }
  }

  return Array.from(normalized)
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

export async function getNotificationSegmentCounts(): Promise<SegmentCounts> {
  await requireAdmin()

  const subscribedEmails = await getSubscribedNewsletterEmails()

  if (subscribedEmails.length === 0) {
    return {
      registered: 0,
      builders: 0,
      explorers: 0,
      withProducts: 0,
      withoutProducts: 0,
      buildersWithProducts: 0,
      buildersWithoutProducts: 0,
      explorersWithoutProducts: 0,
    }
  }

  const emailFilter = {
    email: { in: subscribedEmails, mode: "insensitive" as const },
  }

  const activeMemberWhere = {
    status: "active" as const,
    role: { not: "admin" },
    ...emailFilter,
  }

  const builderIntentWhere = {
    ...activeMemberWhere,
    roleIntent: { in: [...BUILDER_INTENTS] },
  }

  const explorerIntentWhere = {
    ...activeMemberWhere,
    roleIntent: EXPLORER_INTENT,
  }

  const [
    registered,
    builders,
    explorers,
    withProducts,
    withoutProducts,
    buildersWithProducts,
    buildersWithoutProducts,
    explorersWithoutProducts,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        ...activeMemberWhere,
      },
    }),
    prisma.user.count({
      where: {
        ...builderIntentWhere,
      },
    }),
    prisma.user.count({
      where: {
        ...explorerIntentWhere,
      },
    }),
    prisma.user.count({
      where: {
        ...activeMemberWhere,
        products: { some: {} },
      },
    }),
    prisma.user.count({
      where: {
        ...activeMemberWhere,
        products: { none: {} },
      },
    }),
    prisma.user.count({
      where: {
        ...builderIntentWhere,
        products: { some: {} },
      },
    }),
    prisma.user.count({
      where: {
        ...builderIntentWhere,
        products: { none: {} },
      },
    }),
    prisma.user.count({
      where: {
        ...explorerIntentWhere,
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
    buildersWithProducts,
    buildersWithoutProducts,
    explorersWithoutProducts,
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
    return users.map((user) => ({
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
      return users.map((user) => ({
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
      return users.map((user) => ({
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
      return users.map((user) => ({
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
      return users.map((user) => ({
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
      return users.map((user) => ({
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
      return users.map((user) => ({
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
      return users.map((user) => ({
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

export async function sendBuilderOutreachEmailsAction(
  formData: FormData,
): Promise<SendBuilderOutreachResponse> {
  try {
    await requireAdmin()
  } catch {
    return { error: "Unauthorized" }
  }

  const emailsRaw = formData.get("emails")?.toString() ?? ""

  if (!emailsRaw.trim()) {
    return { error: "Enter at least one email address" }
  }

  const parsed = parseEmailList(emailsRaw)
  const recipients = parsed.valid
  const invalid = parsed.invalid

  if (recipients.length === 0) {
    return {
      error: "We couldn't find any valid email addresses",
      invalidEmails: invalid,
    }
  }

  const failed: { email: string; error: string }[] = []
  let sent = 0

  for (const [index, email] of recipients.entries()) {
    if (index > 0) {
      await wait(RATE_LIMIT_INTERVAL_MS)
    }

    const firstName = deriveFirstNameFromEmail(email)

    try {
      await sendEmail({
        to: email,
        subject: BUILDER_OUTREACH_SUBJECT,
        text: buildBuilderOutreachTextBody(firstName),
        react: <BuilderOutreachEmail firstName={firstName} />,
      })
      sent += 1
    } catch (error: any) {
      console.error(`Failed to send builder outreach email to ${email}`, error)
      failed.push({
        email,
        error: error?.message ?? "Unknown error",
      })
    }
  }

  if (sent === 0) {
    return {
      error: "Failed to send builder outreach emails",
      invalidEmails: invalid.length > 0 ? invalid : undefined,
    }
  }

  const totalRecipients = recipients.length

  return {
    success: true,
    summary: {
      totalRecipients,
      attempted: totalRecipients,
      sent,
      failed,
      invalidEmails: invalid,
      sentPercentage: calculatePercentage(sent, totalRecipients),
      failedPercentage: calculatePercentage(failed.length, totalRecipients),
    },
  }
}

export async function renderBuilderOutreachEmailPreviewAction(params?: {
  firstName?: string | null
  email?: string | null
}): Promise<string | null> {
  try {
    await requireAdmin()
  } catch {
    return null
  }

  const normalizedFirstName = params?.firstName?.trim()
  const fallbackName = params?.email
    ? (deriveFirstNameFromEmail(params.email) ?? null)
    : null
  const resolvedFirstName = normalizedFirstName || fallbackName || undefined

  try {
    return await renderAsync(
      <BuilderOutreachEmail firstName={resolvedFirstName} />,
    )
  } catch (error) {
    console.error("Failed to render builder outreach email preview", error)
    return null
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
