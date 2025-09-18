import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getPlans, getPlansCount } from "@/actions/admin/plans/actions"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Plans",
  description: "Manage plans in the admin panel",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

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
