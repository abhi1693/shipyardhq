import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type AdminProductRow } from "./columns"
import { getProducts, getProductsCount } from "@/actions/admin/products/actions"
import ProductDraftStartButton from "@/components/pages/products/ProductDraftStartButton"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { buildPageMetadata } from "@/lib/metadata"
import { Plus } from "lucide-react"

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
    <ListPageWrapper
      title="Products"
      addAction={
        <ProductDraftStartButton
          mode="admin"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--brand-1)/0.3] bg-background/95 px-5 py-2 text-xs font-semibold text-[color:var(--brand-1)] transition-colors hover:border-[color:var(--brand-1)/0.4] hover:bg-[color:var(--brand-1)/0.08] md:text-sm"
        >
          <Plus className="h-4 w-4" />
          Add New
        </ProductDraftStartButton>
      }
    >
      <EntityList
        columns={columns}
        data={typedProducts}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
