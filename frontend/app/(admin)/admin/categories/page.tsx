import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getCategories,
  getCategoriesCount,
} from "@/actions/admin/categories/actions"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { buildPageMetadata } from "@/lib/metadata"
import { adminPath } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Categories",
  section: "Admin",
  description: "Manage categories in the admin panel",
})

// Ensure this page always reflects the latest DB state
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CategoryPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const { pageSize, skip, take } = resolvePagination(resolvedSearchParams)

  const [categories, totalCategories] = await Promise.all([
    getCategories({ skip, take }),
    getCategoriesCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalCategories / pageSize), 1)

  return (
    <ListPageWrapper
      title="Categories"
      addLink={adminPath("categories", "add")}
    >
      <EntityList columns={columns} data={categories} pageCount={pageCount} />
    </ListPageWrapper>
  )
}
