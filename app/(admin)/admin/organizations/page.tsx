import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import {
  getOrganizations,
  getOrganizationsCount,
} from "@/actions/admin/organizations/actions"
import { columns } from "./columns"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Organizations",
  description: "Manage organizations in the admin panel",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

  const [orgs, totalOrgs] = await Promise.all([
    getOrganizations({ skip, take }),
    getOrganizationsCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalOrgs / pageSize), 1)
  return (
    <ListPageWrapper title="Organizations" addLink="/admin/organizations/add">
      <EntityList columns={columns} data={orgs} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
