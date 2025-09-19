import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type AdminProductRow } from "./columns"
import { getProducts, getProductsCount } from "@/actions/admin/products/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Products",
  section: "Admin",
  description: "Manage products in the admin panel",
})

export default async function CategoryPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

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
