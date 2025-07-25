import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getProducts } from "@/actions/admin/products/actions"

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage categories in the admin panel",
}

export default async function CategoryPage() {
  const products = await getProducts()

  return (
    <ListPageWrapper title="Products" addLink="/admin/products/add">
      <EntityList columns={columns} data={products} />
    </ListPageWrapper>
  )
}
