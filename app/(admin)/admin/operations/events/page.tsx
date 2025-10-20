import { getEventEnvelopesPaginated } from "@/actions/admin/events/actions"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type EventEnvelopeTableRow } from "./columns"

export const dynamic = "force-dynamic"

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

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

  const {
    items,
    total,
    pageSize: effectivePageSize,
  } = await getEventEnvelopesPaginated({ page, pageSize })

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
      <EntityList columns={columns} data={rows} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
