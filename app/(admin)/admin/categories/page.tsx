import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getCategories } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage categories in the admin panel",
}

// Ensure this page always reflects the latest DB state
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CategoryPage() {
  const categories = await getCategories()

  return (
    <ListPageWrapper title="Categories" addLink="/admin/categories/add">
      <EntityList columns={columns} data={categories} />
    </ListPageWrapper>
  )
}
