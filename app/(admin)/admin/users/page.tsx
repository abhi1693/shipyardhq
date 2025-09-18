import { Metadata } from "next"
import { getUsers, getUsersCount } from "@/actions/admin/users/actions"
import { columns } from "./columns"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"

export const metadata: Metadata = {
  title: "Users",
  description: "Manage users in the admin panel",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
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

export default async function UserPage({
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

  const [users, totalUsers] = await Promise.all([
    getUsers({ skip, take: pageSize }),
    getUsersCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalUsers / pageSize), 1)

  return (
    <ListPageWrapper title="Users" addLink="/admin/users/add">
      <EntityList columns={columns} data={users} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
