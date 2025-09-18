import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type AdminProductRow } from "./columns"
import { getProducts, getProductsCount } from "@/actions/admin/products/actions"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage products in the admin panel",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function CategoryPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

  const [products, totalProducts] = await Promise.all([
    getProducts({ skip, take }),
    getProductsCount(),
  ])

  const typedProducts = products as AdminProductRow[]
  const pageCount = Math.max(Math.ceil(totalProducts / pageSize), 1)

  return (
    <ListPageWrapper title="Products" addLink="/admin/products/add">
      <EntityList
        columns={columns}
        data={typedProducts}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
