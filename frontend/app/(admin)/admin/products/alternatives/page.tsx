import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type AlternativeProductRow } from "./columns"
import {
  getAlternativeProducts,
  getAlternativeProductsCount,
} from "@/actions/admin/alternative-products/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { buildPageMetadata } from "@/lib/metadata"
import { adminPath } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Alternatives",
  section: "Admin",
  description: "Manage the catalog of external products customers compare.",
})

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AlternativeProductsPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [alternatives, totalAlternatives] = await Promise.all([
    getAlternativeProducts({ skip, take }),
    getAlternativeProductsCount(),
  ])

  const data = alternatives as AlternativeProductRow[]
  const pageCount = Math.max(Math.ceil(totalAlternatives / pageSize), 1)

  return (
    <ListPageWrapper
      title="Alternatives"
      description="Curate the third-party products buyers evaluate alongside Shipyard listings."
      addLink={adminPath("products", "alternatives", "add")}
    >
      <EntityList columns={columns} data={data} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
