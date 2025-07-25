import { Metadata } from "next"
import { Product } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { getProducts } from "@/controllers/products"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage products in the admin panel",
}

export default async function ProductPage() {
  const products = await getProducts()

  const columns: ColumnDef<Product>[] = [
    { id: "id", accessorKey: "id" },
    { id: "name", accessorKey: "name" },
    { id: "description", accessorKey: "description" },
    { id: "userId", accessorKey: "userId" },
    { id: "categoryId", accessorKey: "categoryId" },
    { id: "createdAt", accessorKey: "createdAt" },
    { id: "updatedAt", accessorKey: "updatedAt" },
  ]

  return (
    <ListPageWrapper title="Products">
      <EntityList columns={columns} data={products} pageCount={10} />
    </ListPageWrapper>
  )
}
