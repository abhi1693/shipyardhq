import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { getOrganizations } from "@/actions/admin/organizations/actions"
import { columns } from "./columns"

export const metadata: Metadata = {
  title: "Organizations",
  description: "Manage organizations in the admin panel",
}

export default async function OrganizationsPage() {
  const orgs = await getOrganizations()
  return (
    <ListPageWrapper title="Organizations" addLink="/admin/organizations/add">
      <EntityList columns={columns} data={orgs} />
    </ListPageWrapper>
  )
}

