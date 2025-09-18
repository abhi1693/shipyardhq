import {
  getAllAssignedBadges,
  getAllAssignedBadgesCount,
} from "@/actions/admin/badges/actions"
import { columns } from "./columns"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { resolvePagination } from "@/lib/pagination"

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function AssignedProductBadgesPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

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
