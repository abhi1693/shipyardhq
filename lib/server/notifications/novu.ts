import { createHmac } from "crypto"
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

export type NovuSubscriberSource = {
  subscriberId?: string | null
} & Partial<Omit<NovuSubscriberInput, "subscriberId">>

export function isClerkUserId(value: string): boolean {
  return value.trim().startsWith("user_")
}

export function toNovuSubscriberInput(
  source?: NovuSubscriberSource | null,
): NovuSubscriberInput | null {
  if (!source) return null

  const subscriberId = source.subscriberId?.trim()
  if (!subscriberId || !isClerkUserId(subscriberId)) return null

  return omitUndefined({
    subscriberId,
    email: normalizeNovuString(source.email),
    phone: normalizeNovuString(source.phone),
    firstName: normalizeNovuString(source.firstName),
    lastName: normalizeNovuString(source.lastName),
    avatar: normalizeNovuString(source.avatar),
    locale: normalizeNovuString(source.locale),
    timezone: normalizeNovuString(source.timezone),
    data: source.data ?? undefined,
  })
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

export function generateNovuSubscriberHash(subscriberId: string): string {
  if (!NOVU_SECRET_KEY) {
    throw new Error("NOVU_SECRET_KEY (or NOVU_API_KEY) is not configured")
  }

  const trimmed = requireClerkUserId(subscriberId)

  return createHmac("sha256", NOVU_SECRET_KEY).update(trimmed).digest("hex")
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
  const trimmedSubscriberId = requireClerkUserId(subscriberId)

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

export async function fetchNovuSubscriberIds(limit = 100): Promise<string[]> {
  if (!isNovuEnabled()) return []

  const client = getNovuClient()
  const ids: string[] = []
  let cursor: string | undefined

  do {
    const response = await client.subscribers.search({
      limit,
      after: cursor,
    })

    const page = response.result?.data ?? []
    for (const subscriber of page) {
      const id = subscriber.subscriberId?.trim()
      if (id) {
        ids.push(id)
      }
    }

    cursor = response.result?.next ?? undefined
  } while (cursor)

  return ids
}

export async function subscribeNovuTopic(
  topicKey: string,
  subscriberIds: string | string[],
): Promise<void> {
  if (!isNovuEnabled()) return

  const trimmedKey = topicKey.trim()
  if (!trimmedKey) return

  const ids = Array.isArray(subscriberIds) ? subscriberIds : [subscriberIds]
  const normalized = ids
    .map((id) => id?.toString().trim())
    .filter((id): id is string => Boolean(id) && isClerkUserId(id))

  if (!normalized.length) return

  try {
    const client = getNovuClient()
    await client.topics.subscriptions.create(
      { subscriberIds: normalized },
      trimmedKey,
    )
  } catch (error) {
    console.error("[novu] failed to subscribe to topic", {
      topicKey: trimmedKey,
      subscriberCount: normalized.length,
      error,
    })
  }
}

function requireClerkUserId(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error("Novu subscriberId is required")
  }
  if (!isClerkUserId(trimmed)) {
    throw new Error("Novu subscriberId must be a Clerk user id (user_*)")
  }
  return trimmed
}
