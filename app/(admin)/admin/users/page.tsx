import { Metadata } from "next"
import { getUsers } from "@/actions/admin/users/actions"
import { columns } from "./columns"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"

export const metadata: Metadata = {
  title: "Users",
  description: "Manage users in the admin panel",
}

export default async function UserPage() {
  const users = await getUsers()

  return (
    <ListPageWrapper title="Users">
      <EntityList columns={columns} data={users} pageCount={10} />
    </ListPageWrapper>
  )
}
