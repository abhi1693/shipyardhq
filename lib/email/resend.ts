// Helper to send transactional mail via Resend
import type { ReactElement } from "react"
import { Resend } from "resend"

type SendEmailOptions = {
  from?: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  subject: string
  text?: string
  html?: string
  react?: ReactElement
  headers?: Record<string, string>
}

let client: Resend | null = null
const defaultFrom = process.env.RESEND_FROM_EMAIL

function getClient(): Resend {
  if (client) return client
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  client = new Resend(key)
  return client
}

function hasBodyContent(opts: SendEmailOptions): boolean {
  return Boolean(opts.text || opts.html || opts.react)
}

export async function sendEmail(options: SendEmailOptions) {
  if (!hasBodyContent(options)) {
    throw new Error("Email body is required")
  }

  const resend = getClient()
  const from = options.from ?? defaultFrom
  if (!from) {
    throw new Error(
      "Missing sender. Provide options.from or set RESEND_FROM_EMAIL.",
    )
  }

  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
    html: options.html,
    react: options.react,
    headers: options.headers,
  })

  if (error) {
    throw error
  }

  return data
}

export type { SendEmailOptions }
