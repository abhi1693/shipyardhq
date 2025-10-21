import {
  getAdminNotificationCount,
  getAdminNotifications,
} from "@/actions/admin/notifications/actions"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { buildPageMetadata } from "@/lib/metadata"

import { columns } from "./columns"

export const metadata = buildPageMetadata({
  title: "All Notifications",
  section: "Admin",
  description: "Review every notification delivered across Shipyard.",
})

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

const coerceNumber = (
  value: string | string[] | undefined,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {},
) => {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  const boundedMin = Math.max(parsed, min ?? parsed)
  if (typeof max === "number") {
    return Math.min(boundedMin, max)
  }
  return boundedMin
}

export default async function AdminNotificationsIndexPage({
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

  const skip = (page - 1) * pageSize

  const [notifications, totalNotifications] = await Promise.all([
    getAdminNotifications({ skip, take: pageSize }),
    getAdminNotificationCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalNotifications / pageSize), 1)

  return (
    <ListPageWrapper
      title="All Notifications"
      description="Audit in-app notifications across members."
    >
      <EntityList
        columns={columns}
        data={notifications}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
