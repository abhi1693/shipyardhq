import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getAssignedFeatures,
  getAssignedFeaturesCount,
} from "@/actions/admin/plans/assignments/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Assigned Features",
  description: "View all plan-feature assignments",
}

export default async function AssignedFeaturePage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [assignments, totalAssignments] = await Promise.all([
    getAssignedFeatures({ skip, take }),
    getAssignedFeaturesCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalAssignments / pageSize), 1)

  return (
    <ListPageWrapper
      title="Assigned Features"
      addLink="/admin/plans/assignments/add"
    >
      <EntityList columns={columns} data={assignments} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
