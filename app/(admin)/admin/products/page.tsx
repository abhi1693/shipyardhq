import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type AdminProductRow } from "./columns"
import { getProducts } from "@/actions/admin/products/actions"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage products in the admin panel",
}

export default async function CategoryPage() {
  const products = (await getProducts()) as AdminProductRow[]

  return (
    <ListPageWrapper title="Products" addLink="/admin/products/add">
      <EntityList columns={columns} data={products} />
    </ListPageWrapper>
  )
}
