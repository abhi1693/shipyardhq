import {
  getFeedbackEntries,
  getFeedbackCount,
} from "@/actions/admin/feedback/actions"
import { columns } from "./columns"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { buildPageMetadata } from "@/lib/metadata"
import { FeedbackStatus } from "@/lib/vendor/prisma/client"
import StatusFilter from "./status-filter"

export const metadata = buildPageMetadata({
  title: "Feedback",
  section: "Admin",
  description: "Review member feedback submitted through the member portal.",
})

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
  status?: string | string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const VALID_STATUSES: (FeedbackStatus | "all")[] = [
  "all",
  "received",
  "in_review",
  "closed",
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
): FeedbackStatus | "all" | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return "all"
  return VALID_STATUSES.includes(raw as any)
    ? (raw as FeedbackStatus | "all")
    : "all"
}

export default async function AdminFeedbackPage({
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

  const status = parseStatus(resolvedSearchParams?.status) ?? "all"

  const skip = (page - 1) * pageSize

  const [entries, total] = await Promise.all([
    getFeedbackEntries({ skip, take: pageSize, status }),
    getFeedbackCount({ status }),
  ])

  const pageCount = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <ListPageWrapper
      title="Member feedback"
      description="Browse feedback submitted by members and keep tabs on recurring themes."
    >
      <div className="flex flex-col gap-4">
        <StatusFilter status={status} />
        <EntityList data={entries} columns={columns} pageCount={pageCount} />
      </div>
    </ListPageWrapper>
  )
}
