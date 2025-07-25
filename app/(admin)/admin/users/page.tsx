import { Metadata } from "next"
import { getUsers } from "@/controllers/users"
import { User } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"

export const metadata: Metadata = {
  title: "Users",
  description: "Manage users in the admin panel",
}

export default async function UserPage() {
  const users = await getUsers()

  const columns: ColumnDef<User>[] = [
    { id: "id", accessorKey: "id" },
    { id: "clerkId", accessorKey: "clerkId" },
    { id: "email", accessorKey: "email" },
    { id: "firstName", accessorKey: "firstName" },
    { id: "lastName", accessorKey: "lastName" },
    { id: "role", accessorKey: "role" },
    { id: "createdAt", accessorKey: "createdAt" },
    { id: "updatedAt", accessorKey: "updatedAt" },
  ]

  return (
    <ListPageWrapper title="Users">
      <EntityList columns={columns} data={users} pageCount={10} />
    </ListPageWrapper>
  )
}
