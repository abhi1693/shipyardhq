const EVENT_QUEUE_IDS = ["high", "default", "low"] as const

export type EventQueueName = (typeof EVENT_QUEUE_IDS)[number]

export type EventQueueDefinition = {
  id: EventQueueName
  label: string
  intervalMinutes: number
  description: string
}

export const EVENT_QUEUE_DEFINITIONS: Record<
  EventQueueName,
  EventQueueDefinition
> = {
  high: {
    id: "high",
    label: "High priority",
    intervalMinutes: 5,
    description:
      "Fast lane for cache revalidation and other latency-sensitive tasks.",
  },
  default: {
    id: "default",
    label: "Default priority",
    intervalMinutes: 15,
    description:
      "Standard worker cadence for most business logic and reward flows.",
  },
  low: {
    id: "low",
    label: "Low priority",
    intervalMinutes: 30,
    description:
      "Deferred work such as notifications and external side effects.",
  },
} as const

export const DEFAULT_EVENT_QUEUE: EventQueueName = "default"

export function isEventQueue(value: unknown): value is EventQueueName {
  return (
    typeof value === "string" &&
    (EVENT_QUEUE_IDS as ReadonlyArray<string>).includes(value)
  )
}

export function coerceEventQueue(
  value?: string | null,
): EventQueueName | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  return isEventQueue(normalized) ? (normalized as EventQueueName) : undefined
}

export function assertEventQueue(
  value: string | null | undefined,
): EventQueueName {
  const resolved = coerceEventQueue(value)
  if (!resolved) {
    throw new Error(`Unsupported event queue "${value ?? ""}"`)
  }
  return resolved
}

export function getEventQueueDefinition(
  queue: EventQueueName,
): EventQueueDefinition {
  return EVENT_QUEUE_DEFINITIONS[queue]
}

export const EVENT_QUEUE_NAMES: ReadonlyArray<EventQueueName> = EVENT_QUEUE_IDS
