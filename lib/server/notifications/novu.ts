import { Novu } from "@novu/api"
import type {
  CreateSubscriberRequestDto,
  Overrides,
  SubscriberPayloadDto,
  TriggerEventRequestDto,
} from "@novu/api/models/components"

const NOVU_SECRET_KEY =
  process.env.NOVU_SECRET_KEY?.trim() ?? null

let cachedClient: Novu | null = null
type TriggerResponse = Awaited<ReturnType<Novu["trigger"]>>

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
}

export function isNovuEnabled(): boolean {
  return Boolean(NOVU_SECRET_KEY)
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
