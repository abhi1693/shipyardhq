import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import { getUserProducts } from "@/actions/member/products/actions"
import MemberProductFilters from "@/components/molecules/MemberProductFilters"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage your products, view analytics, and track performance.",
}

export default async function CategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { products, total, limit } = await getUserProducts(params)
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  return (
    <ListPageWrapper title="Products" addLink="/member/products/add">
      <MemberProductFilters />
      <EntityList columns={columns} data={products} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
