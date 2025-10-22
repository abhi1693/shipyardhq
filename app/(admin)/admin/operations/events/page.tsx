import { getEventEnvelopesPaginated } from "@/actions/admin/events/actions"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import {
  coerceEventQueue,
  type EventQueueName,
} from "@/lib/server/events/queues"
import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"
import QueueFilter from "./queue-filter"
import StatusFilter from "./status-filter"
import { columns, type EventEnvelopeTableRow } from "./columns"

export const dynamic = "force-dynamic"

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
  status?: string | string[]
  queue?: string | string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100
const VALID_STATUSES: ReadonlyArray<EventEnvelopeStatus | "all"> = [
  "all",
  "pending",
  "processing",
  "retrying",
  "completed",
  "dead_letter",
]

function coerceNumber(
  value: string | string[] | undefined,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {},
) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  const boundedMin = Math.max(parsed, min ?? parsed)
  const boundedMax =
    typeof max === "number" ? Math.min(boundedMin, max) : boundedMin
  return boundedMax
}

function parseStatus(
  value: string | string[] | undefined,
): EventEnvelopeStatus | "all" {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return "all"
  return VALID_STATUSES.includes(raw as EventEnvelopeStatus | "all")
    ? (raw as EventEnvelopeStatus | "all")
    : "all"
}

function parseQueue(
  value: string | string[] | undefined,
): EventQueueName | "all" {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return "all"
  if (raw === "all") return "all"
  const parsed = coerceEventQueue(raw)
  return parsed ?? "all"
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const page = coerceNumber(resolvedSearchParams?.page, DEFAULT_PAGE, {
    min: 1,
  })
  const pageSize = coerceNumber(
    resolvedSearchParams?.limit,
    DEFAULT_PAGE_SIZE,
    {
      min: 1,
      max: MAX_PAGE_SIZE,
    },
  )

  const status = parseStatus(resolvedSearchParams?.status)
  const queue = parseQueue(resolvedSearchParams?.queue)

  const {
    items,
    total,
    pageSize: effectivePageSize,
  } = await getEventEnvelopesPaginated({
    page,
    pageSize,
    status,
    queue,
  })

  const pageCount = Math.max(Math.ceil(total / effectivePageSize), 1)

  const rows: EventEnvelopeTableRow[] = items.map((item) => ({
    ...item,
    enqueuedAt: item.enqueuedAt,
    updatedAt: item.updatedAt,
  }))

  return (
    <ListPageWrapper
      title="Events"
      description="Browse asynchronous envelopes for troubleshooting and manual intervention."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <StatusFilter status={status} />
          <QueueFilter queue={queue} />
        </div>
        <EntityList columns={columns} data={rows} pageCount={pageCount} />
      </div>
    </ListPageWrapper>
  )
}
