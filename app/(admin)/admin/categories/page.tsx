import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { categoryColumns } from "./columns"
import { getCategories } from "@/actions/admin/categories/actions"

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
