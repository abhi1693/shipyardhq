import {
  getNewsletterSubscriberCount,
  getNewsletterSubscribers,
} from "@/actions/admin/newsletter/actions"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { buildPageMetadata } from "@/lib/metadata"
import { adminPath } from "@/lib/routes"

import { columns } from "./columns"

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
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

export const metadata = buildPageMetadata({
  title: "Newsletter Subscribers",
  section: "Admin",
  description:
    "Review newsletter subscribers and manage manual additions or removals.",
})

export default async function NewsletterSubscribersPage({
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

  const [subscribers, totalSubscribers] = await Promise.all([
    getNewsletterSubscribers({ skip, take: pageSize }),
    getNewsletterSubscriberCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalSubscribers / pageSize), 1)

  return (
    <ListPageWrapper
      title="Newsletter Subscribers"
      addLink={adminPath("notifications", "newsletter", "add")}
      description="Add, review, or remove newsletter subscriber records."
    >
      <EntityList columns={columns} data={subscribers} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
