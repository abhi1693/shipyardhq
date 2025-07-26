import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getUserProducts } from "@/actions/member/products/actions"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage your products, view analytics, and track performance.",
}

export default async function CategoryPage() {
  const products = await getUserProducts()

  return (
    <ListPageWrapper title="Products" addLink="/member/products/add">
      <EntityList columns={columns} data={products} />
    </ListPageWrapper>
  )
}
