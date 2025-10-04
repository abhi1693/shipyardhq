import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { buildPageMetadata } from "@/lib/metadata"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { adminPath } from "@/lib/routes"
import {
  getRewardRules,
  getRewardRulesCount,
} from "@/actions/admin/points/actions"

import { columns } from "./columns"

export const metadata = buildPageMetadata({
  title: "Reward rules",
  section: "Admin",
  description: "Manage engagement reward rules.",
})

export default async function RewardRulesPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const { skip, take, pageSize } = resolvePagination(resolved)

  const [rules, total] = await Promise.all([
    getRewardRules({ skip, take }),
    getRewardRulesCount(),
  ])

  const pageCount = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <ListPageWrapper
      title="Reward rules"
      description="Configure how members earn Shipyard rewards."
      addLink={adminPath("rewards", "rules", "add")}
    >
      <EntityList columns={columns} data={rules} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
