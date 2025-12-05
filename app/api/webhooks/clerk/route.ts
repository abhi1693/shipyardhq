import { NextResponse } from "next/server"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { verifyWebhook } from "@clerk/backend/webhooks"

import {
  trackLoginInGa,
  trackSignupInGa,
} from "@/lib/server/analytics/loginTracking"
import { subscribeUserToBroadcastTopic } from "@/lib/server/notifications/novuBroadcast"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let event: WebhookEvent
  try {
    event = await verifyWebhook(req)
  } catch (error) {
    console.error("[clerk-webhook] verification failed", error)
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "session.created":
        await handleSessionCreated(event)
        break
      case "user.created":
        await handleUserCreated(event)
        break
      default:
        console.info("[clerk-webhook] ignored event", event.type)
    }
  } catch (error) {
    console.error("[clerk-webhook] handler error", error)
    return NextResponse.json({ error: "handler error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function handleSessionCreated(event: WebhookEvent) {
  if (event.type !== "session.created") return

  const session = event.data as SessionPayload
  const user = session.user

  const method = pickMethodFromUser(user)
  if (!method) {
    console.info("[clerk-webhook] no supported auth method resolved", {
      userId: user?.id ?? null,
    })
    return
  }

  await trackLoginInGa({ method })

  await subscribeClerkUserToBroadcast(user)
}

async function handleUserCreated(event: WebhookEvent) {
  if (event.type !== "user.created") return

  const user = event.data as SessionUserPayload

  await subscribeClerkUserToBroadcast(user)

  const method = pickMethodFromUser(user)
  if (!method) {
    console.info("[clerk-webhook] no supported sign up method resolved", {
      userId: user?.id ?? null,
    })
    return
  }

  await trackSignupInGa({ method })
}

type SessionPayload = {
  user?: SessionUserPayload
}

type SessionEmailAddress = {
  id?: string | null
  email_address?: string | null
  linked_to?: { type?: string | null }[] | null
}

type SessionUserPayload = {
  id?: string
  primary_email_address_id?: string | null
  email_addresses?: SessionEmailAddress[]
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
}

function pickMethodFromUser(user?: SessionUserPayload) {
  const emails: SessionEmailAddress[] = Array.isArray(user?.email_addresses)
    ? user.email_addresses || []
    : []

  const email = emails[0]
  if (!email) return undefined

  const linkedTo = Array.isArray(email?.linked_to) ? email?.linked_to || [] : []
  if (linkedTo.length === 0) return "Email"

  for (const link of linkedTo) {
    const sanitizedType = sanitizeLinkedType(link?.type)
    if (sanitizedType) return sanitizedType
  }

  return undefined
}

function sanitizeLinkedType(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return undefined

  const parts = raw.split("_").filter(Boolean)
  const provider = parts[1] ?? parts[0]
  if (!provider) return undefined

  const lower = provider.toLowerCase()
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
}

async function subscribeClerkUserToBroadcast(
  user?: SessionUserPayload,
): Promise<void> {
  const subscriberId = sanitizeClerkString(user?.id)
  const email = getPrimaryEmailFromUser(user)

  if (!subscriberId || !email) return

  await subscribeUserToBroadcastTopic({
    subscriberId,
    email,
    firstName: sanitizeClerkString(user?.first_name),
    lastName: sanitizeClerkString(user?.last_name),
    avatar: sanitizeClerkString(user?.image_url),
  })
}

function sanitizeClerkString(value?: string | null): string | undefined {
  const raw = typeof value === "string" ? value.trim() : ""
  return raw || undefined
}

function getPrimaryEmailFromUser(
  user?: SessionUserPayload,
): string | undefined {
  const emails: SessionEmailAddress[] = Array.isArray(user?.email_addresses)
    ? user?.email_addresses || []
    : []

  if (emails.length === 0) return undefined

  const primaryId = sanitizeClerkString(user?.primary_email_address_id)
  const primary =
    (primaryId &&
      emails.find((email) => sanitizeClerkString(email?.id) === primaryId)) ||
    emails[0]

  const email = sanitizeClerkString(primary?.email_address)
  return email
}
