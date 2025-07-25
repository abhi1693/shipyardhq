import { getUsers } from "@/controllers/users"
import DataTable from "@/components/molecules/DataTable"
import { User } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"

export default async function UserListPage() {
  const users = await getUsers()
  const columns: ColumnDef<User>[] = [
    {
      id: "id",
      accessorKey: "id",
    },
    {
      id: "clerkId",
      accessorKey: "clerkId",
    },
    {
      id: "email",
      accessorKey: "email",
    },
    {
      id: "firstName",
      accessorKey: "firstName",
    },
    {
      id: "lastName",
      accessorKey: "lastName",
    },
    {
      id: "role",
      accessorKey: "role",
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={users} pageCount={10} />
    </>
  )
}
