import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import {
  getOrganizations,
  getOrganizationsCount,
} from "@/actions/admin/organizations/actions"
import { columns } from "./columns"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { buildPageMetadata } from "@/lib/metadata"
import { adminPath } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Organizations",
  section: "Admin",
  description: "Manage organizations in the admin panel.",
})

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [orgs, totalOrgs] = await Promise.all([
    getOrganizations({ skip, take }),
    getOrganizationsCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalOrgs / pageSize), 1)
  return (
    <ListPageWrapper
      title="Organizations"
      addLink={adminPath("organizations", "add")}
    >
      <EntityList columns={columns} data={orgs} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
