import { Novu } from "@novu/api"
import type {
  CreateSubscriberRequestDto,
  Overrides,
  SubscriberPayloadDto,
  TriggerEventRequestDto,
} from "@novu/api/models/components"

const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY?.trim() ?? null

let cachedClient: Novu | null = null
type TriggerResponse = Awaited<ReturnType<Novu["trigger"]>>
export type NovuWorkflowGuardResult =
  | { ready: true; workflowId: string }
  | { ready: false; reason: "novu-disabled" | "missing-workflow" }

export type NovuSubscriberInput = {
  subscriberId: string
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  locale?: string | null
  timezone?: string | null
  data?: Record<string, unknown> | null
}

export type TriggerNovuWorkflowInput = {
  workflowId: string
  subscriber: NovuSubscriberInput
  payload?: TriggerEventRequestDto["payload"]
  transactionId?: string
  actor?: string | NovuSubscriberInput
  overrides?: Overrides
  context?: TriggerEventRequestDto["context"]
  tenant?: TriggerEventRequestDto["tenant"]
  ensureSubscriber?: boolean
  ensureActor?: boolean
}

export function isNovuEnabled(): boolean {
  return Boolean(NOVU_SECRET_KEY)
}

export function guardNovuWorkflow(
  workflowId: string | null | undefined,
  options: { label: string; missingMessage?: string },
): NovuWorkflowGuardResult {
  if (!isNovuEnabled()) {
    return { ready: false, reason: "novu-disabled" }
  }

  const trimmed = workflowId?.trim()
  if (!trimmed) {
    const warning =
      options.missingMessage ||
      `[novu] ${options.label} workflow id is not configured`
    console.warn(warning)
    return { ready: false, reason: "missing-workflow" }
  }

  return { ready: true, workflowId: trimmed }
}

export function getNovuClient(): Novu {
  if (cachedClient) return cachedClient

  if (typeof window !== "undefined") {
    throw new Error("Novu server client cannot be used in the browser")
  }

  if (!NOVU_SECRET_KEY) {
    throw new Error("NOVU_SECRET_KEY (or NOVU_API_KEY) is not configured")
  }

  cachedClient = new Novu({
    secretKey: NOVU_SECRET_KEY,
  })

  return cachedClient
}

export async function ensureNovuSubscriber(
  subscriber: NovuSubscriberInput,
): Promise<void> {
  const client = getNovuClient()
  const payload = toSubscriberPayload(subscriber)
  await client.subscribers.create(payload)
}

export async function triggerNovuWorkflow(
  input: TriggerNovuWorkflowInput,
): Promise<TriggerResponse> {
  const {
    workflowId,
    subscriber,
    payload,
    transactionId,
    actor,
    overrides,
    context,
    tenant,
    ensureSubscriber = true,
    ensureActor = false,
  } = input

  const trimmedWorkflowId = workflowId.trim()
  if (!trimmedWorkflowId) {
    throw new Error("Novu workflowId is required")
  }

  const subscriberPayload = toSubscriberPayload(subscriber)
  const actorPayload =
    typeof actor === "string" || !actor ? actor : toTriggerSubscriber(actor)

  const client = getNovuClient()

  if (ensureSubscriber) {
    await client.subscribers.create(subscriberPayload)
  }

  const actorSubscriberPayload =
    ensureActor && actor && typeof actor !== "string"
      ? toSubscriberPayload(actor)
      : null

  if (actorSubscriberPayload) {
    await client.subscribers.create(actorSubscriberPayload)
  }

  return client.trigger({
    workflowId: trimmedWorkflowId,
    to: subscriberPayload.subscriberId,
    payload: payload ?? {},
    transactionId: transactionId?.trim() || undefined,
    overrides,
    context,
    tenant,
    actor: actorPayload,
  })
}

function toSubscriberPayload(
  subscriber: NovuSubscriberInput,
): CreateSubscriberRequestDto {
  const { subscriberId, ...rest } = subscriber
  const trimmedSubscriberId = subscriberId.trim()
  if (!trimmedSubscriberId) {
    throw new Error("Novu subscriberId is required")
  }

  return {
    subscriberId: trimmedSubscriberId,
    ...omitUndefined(rest),
  }
}

function toTriggerSubscriber(
  subscriber: NovuSubscriberInput,
): SubscriberPayloadDto {
  const payload = toSubscriberPayload(subscriber)
  return payload as SubscriberPayloadDto
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}

export function normalizeNovuString(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function deleteNovuSubscriber(
  subscriberId: string,
): Promise<void> {
  const client = getNovuClient()
  const trimmed = subscriberId.trim()
  if (!trimmed) {
    throw new Error("Novu subscriberId is required for deletion")
  }
  await client.subscribers.delete(trimmed)
}

export async function fetchAllNovuSubscriberEmails(
  limit = 100,
): Promise<string[]> {
  if (!isNovuEnabled()) return []

  const client = getNovuClient()
  const emails = new Set<string>()

  let cursor: string | undefined
  do {
    const response = await client.subscribers.search({
      limit,
      after: cursor,
    })

    const page = response.result?.data ?? []
    for (const subscriber of page) {
      const email = subscriber.email?.trim().toLowerCase()
      if (email) {
        emails.add(email)
      }
    }

    cursor = response.result?.next ?? undefined
  } while (cursor)

  return Array.from(emails)
}
