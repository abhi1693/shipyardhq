import {
  getAllAssignedBadges,
  getAllAssignedBadgesCount,
} from "@/actions/admin/badges/actions"
import { columns } from "./columns"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"

export default async function AssignedProductBadgesPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [assignments, totalAssignments] = await Promise.all([
    getAllAssignedBadges({ skip, take }),
    getAllAssignedBadgesCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalAssignments / pageSize), 1)

  return (
    <ListPageWrapper
      title="Assigned Product Badges"
      addLink="/admin/products/assignments/badges/add"
    >
      <EntityList
        columns={columns}
        data={assignments}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
