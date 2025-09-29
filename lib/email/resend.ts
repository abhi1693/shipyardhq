import { Resend, type CreateEmailOptions } from "resend"

declare global {
  // eslint-disable-next-line no-var
  var __shipyardhqEmailDeliveryDisabled: boolean | undefined
}

function isEnvFlagEnabled(value: string | undefined) {
  if (!value) return false
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

export function isEmailDeliveryDisabled(): boolean {
  if (globalThis.__shipyardhqEmailDeliveryDisabled) {
    return true
  }

  return isEnvFlagEnabled(process.env.CI)
}

export function disableEmailDelivery() {
  globalThis.__shipyardhqEmailDeliveryDisabled = true
}

export function enableEmailDelivery() {
  globalThis.__shipyardhqEmailDeliveryDisabled = undefined
}

type SendEmailOptions = Omit<CreateEmailOptions, "from"> & {
  from?: CreateEmailOptions["from"]
}

type ResendSendResponse = Awaited<ReturnType<Resend["emails"]["send"]>>
type SendEmailResult = ResendSendResponse["data"]

type RateLimitConfig = {
  maxRequests: number
  intervalMs: number
}

interface EmailSender {
  send(options: SendEmailOptions): Promise<SendEmailResult>
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 2,
  intervalMs: 1000,
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return fallback
}

function loadRateLimitConfig(): RateLimitConfig {
  const maxRequests = parsePositiveInt(
    process.env.RESEND_RATE_LIMIT_MAX_REQUESTS ??
      process.env.RESEND_RATE_LIMIT_RPS,
    DEFAULT_RATE_LIMIT_CONFIG.maxRequests,
  )

  const intervalMs = parsePositiveInt(
    process.env.RESEND_RATE_LIMIT_INTERVAL_MS,
    DEFAULT_RATE_LIMIT_CONFIG.intervalMs,
  )

  return {
    maxRequests: Math.max(1, maxRequests),
    intervalMs: Math.max(1, intervalMs),
  }
}

function hasBodyContent(opts: SendEmailOptions): boolean {
  return Boolean(opts.text || opts.html || opts.react)
}

class ResendEmailSender implements EmailSender {
  private client: Resend | null = null
  private readonly defaultFrom = process.env.RESEND_FROM_EMAIL

  private getClient(): Resend {
    if (this.client) return this.client

    const key = process.env.RESEND_API_KEY
    if (!key) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    this.client = new Resend(key)
    return this.client
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!hasBodyContent(options)) {
      throw new Error("Email body is required")
    }

    const resend = this.getClient()
    const from = options.from ?? this.defaultFrom
    if (!from) {
      throw new Error(
        "Missing sender. Provide options.from or set RESEND_FROM_EMAIL.",
      )
    }

    const payload = {
      ...options,
      from,
    }

    const { data, error } = await resend.emails.send(
      payload as CreateEmailOptions,
    )

    if (error) {
      throw error
    }

    return data
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class RateLimitedEmailSender implements EmailSender {
  private queue: Promise<void> = Promise.resolve()
  private timestamps: number[] = []

  constructor(
    private readonly sender: EmailSender,
    private readonly config: RateLimitConfig,
  ) {}

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const execute = async () => {
      await this.reserveSlot()
      return this.sender.send(options)
    }

    const task = this.queue.then(execute)
    this.queue = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }

  private async reserveSlot() {
    while (true) {
      const now = Date.now()
      this.timestamps = this.timestamps.filter(
        (timestamp) => now - timestamp < this.config.intervalMs,
      )

      if (this.timestamps.length < this.config.maxRequests) {
        this.timestamps.push(now)
        return
      }

      const earliest = this.timestamps[0]
      const waitTime = Math.max(0, this.config.intervalMs - (now - earliest))

      await wait(waitTime)
    }
  }
}

function createDefaultEmailSender(): EmailSender {
  return new RateLimitedEmailSender(
    new ResendEmailSender(),
    loadRateLimitConfig(),
  )
}

let activeEmailSender: EmailSender = createDefaultEmailSender()

export function configureEmailSender(sender: EmailSender) {
  activeEmailSender = sender
}

export function resetEmailSender() {
  activeEmailSender = createDefaultEmailSender()
}

export async function sendEmail(options: SendEmailOptions) {
  if (!hasBodyContent(options)) {
    throw new Error("Email body is required")
  }

  if (isEmailDeliveryDisabled()) {
    return {
      id: `email-disabled-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    } as SendEmailResult
  }

  return activeEmailSender.send(options)
}

export type { EmailSender, RateLimitConfig, SendEmailOptions, SendEmailResult }
