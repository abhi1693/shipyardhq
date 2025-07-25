import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { getCategories } from "@/controllers/categories"
import { categoryColumns } from "./columns"

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage categories in the admin panel",
}

export default async function CategoryPage() {
  const categories = await getCategories()

  return (
    <ListPageWrapper title="Categories" addLink="/admin/categories/add">
      <EntityList columns={categoryColumns} data={categories} />
    </ListPageWrapper>
  )
}
