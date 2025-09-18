import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getAssignedFeatures,
  getAssignedFeaturesCount,
} from "@/actions/admin/plans/assignments/actions"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Assigned Features",
  description: "View all plan-feature assignments",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function AssignedFeaturePage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

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
      <EntityList
        columns={columns}
        data={assignments}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
