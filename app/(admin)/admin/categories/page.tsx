import { Metadata } from "next"
import { Category } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { getCategories } from "@/controllers/categories"

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage categories in the admin panel",
}

export default async function CategoryPage() {
  const categories = await getCategories()

  const columns: ColumnDef<Category>[] = [
    { id: "id", accessorKey: "id" },
    { id: "name", accessorKey: "name" },
    { id: "slug", accessorKey: "slug" },
    { id: "createdAt", accessorKey: "createdAt" },
    { id: "updatedAt", accessorKey: "updatedAt" },
  ]

  return (
    <ListPageWrapper title="Categories" addLink="/admin/categories/add">
      <EntityList columns={columns} data={categories} pageCount={10} />
    </ListPageWrapper>
  )
}
