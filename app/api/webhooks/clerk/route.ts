import { NextResponse } from "next/server"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { verifyWebhook } from "@clerk/backend/webhooks"

import { trackLoginInGa } from "@/lib/server/analytics/loginTracking"

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

  const session = event.data as SessionCreatedPayload
  const user = session.user

  const method = await resolveAuthenticationMethod(session, user)
  if (!method) {
    console.info("[clerk-webhook] no supported auth method resolved", {
      userId: session.user_id ?? null,
    })
    return
  }

  await trackLoginInGa({ method })
}

type SessionPayload = {
  client_id?: string | null
  user_id?: string | null
}

type SessionCreatedPayload = SessionPayload & {
  user?: SessionUserPayload
}

type SessionUserPayload = {
  external_accounts?: { provider?: string | null }[]
  email_addresses?: {
    verification?: { strategy?: string | null; object?: string | null } | null
  }[]
  password_enabled?: boolean
}

const OAUTH_METHOD_MAP: Record<string, string> = {
  oauth_google: "Google",
  oauth_twitter: "Twitter",
  oauth_github: "GitHub",
}

const EMAIL_STRATEGIES = new Set([
  "email_code",
  "email_link",
  "password",
  "verification_email_code",
  "verification_email_link",
])

async function resolveAuthenticationMethod(
  session: SessionPayload,
  user?: SessionUserPayload,
) {
  const userMethod = pickMethodFromUser(user)
  if (userMethod) return userMethod

  const clientId =
    typeof session.client_id === "string" && session.client_id.trim()
      ? session.client_id
      : null

  if (!clientId) {
    return undefined
  }

  try {
    const client = await clerkClient()
    const clientDetails = await client.clients.getClient(clientId)
    const strategy = normalizeStrategy(
      (clientDetails as any)?.last_authentication_strategy,
    )

    if (!strategy) return undefined

    const mapped = OAUTH_METHOD_MAP[strategy]
    if (mapped) return mapped
    if (EMAIL_STRATEGIES.has(strategy)) return "Email"
  } catch (error) {
    console.error("[clerk-webhook] failed to resolve auth strategy", {
      clientId,
      error,
    })
  }

  return undefined
}

function pickMethodFromUser(user?: SessionUserPayload) {
  const externalAccounts: { provider?: string | null }[] = Array.isArray(
    user?.external_accounts,
  )
    ? user.external_accounts || []
    : []

  for (const account of externalAccounts) {
    const provider = normalizeStrategy(account?.provider)
    const mapped = OAUTH_METHOD_MAP[provider]
    if (mapped) return mapped
  }

  const emails: {
    verification?: { strategy?: string | null; object?: string | null } | null
  }[] = Array.isArray(user?.email_addresses) ? user.email_addresses || [] : []

  for (const email of emails) {
    const strategy = normalizeStrategy(email?.verification?.strategy)
    const object = normalizeStrategy(email?.verification?.object)

    if (EMAIL_STRATEGIES.has(strategy) || EMAIL_STRATEGIES.has(object)) {
      return "Email"
    }
  }

  if (user?.password_enabled || emails.length > 0) {
    return "Email"
  }

  return undefined
}

function normalizeStrategy(strategy: unknown) {
  return typeof strategy === "string" ? strategy.trim().toLowerCase() : ""
}
