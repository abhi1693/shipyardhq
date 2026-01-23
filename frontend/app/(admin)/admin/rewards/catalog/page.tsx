import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { buildPageMetadata } from "@/lib/metadata"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { adminPath } from "@/lib/routes"
import {
  getRewardCatalogItems,
  getRewardCatalogItemsCount,
} from "@/actions/admin/rewards/actions"

import { columns } from "./columns"

export const metadata = buildPageMetadata({
  title: "Reward catalog",
  section: "Admin",
  description: "Manage redeemable rewards and pricing.",
})

export default async function RewardCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const { skip, take, pageSize } = resolvePagination(resolved)

  const [items, total] = await Promise.all([
    getRewardCatalogItems({ skip, take }),
    getRewardCatalogItemsCount(),
  ])

  const pageCount = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <ListPageWrapper
      title="Reward catalog"
      description="Configure how members spend their rewards."
      addLink={adminPath("rewards", "catalog", "add")}
    >
      <EntityList columns={columns} data={items} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
