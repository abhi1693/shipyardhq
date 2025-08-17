import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type MemberOrgRow } from "./columns"
import { getMyOrganizationsPage } from "@/actions/member/organizations/actions"

export const metadata: Metadata = {
  title: "Organizations",
  description: "Manage your organizations.",
}

export default async function MemberOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { rows, total, limit } = await getMyOrganizationsPage(params)
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  return (
    <ListPageWrapper title="Organizations" addLink="/member/organizations/add">
      <EntityList
        columns={columns}
        data={rows as unknown as MemberOrgRow[]}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
