import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getPlans, getPlansCount } from "@/actions/admin/plans/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Plans",
  description: "Manage plans in the admin panel",
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [plans, totalPlans] = await Promise.all([
    getPlans({ skip, take }),
    getPlansCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalPlans / pageSize), 1)

  return (
    <ListPageWrapper title="Plans" addLink="/admin/plans/add">
      <EntityList columns={columns} data={plans} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
