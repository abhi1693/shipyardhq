import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getUseCaseAssignments,
  getUseCaseAssignmentsCount,
} from "@/actions/admin/categories/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Assigned Use Cases",
  description: "View all use-case to category assignments",
}

export default async function UseCaseAssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [assignments, totalAssignments] = await Promise.all([
    getUseCaseAssignments({ skip, take }),
    getUseCaseAssignmentsCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalAssignments / pageSize), 1)

  return (
    <ListPageWrapper
      title="Use Case Assignments"
      addLink="/admin/categories/use-cases/assignments/add"
    >
      <EntityList
        columns={columns}
        data={assignments}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
