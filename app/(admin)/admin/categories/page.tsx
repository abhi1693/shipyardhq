import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getCategories,
  getCategoriesCount,
} from "@/actions/admin/categories/actions"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage categories in the admin panel",
}

// Ensure this page always reflects the latest DB state
export const dynamic = "force-dynamic"
export const revalidate = 0

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

  const [categories, totalCategories] = await Promise.all([
    getCategories({ skip, take }),
    getCategoriesCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalCategories / pageSize), 1)

  return (
    <ListPageWrapper title="Categories" addLink="/admin/categories/add">
      <EntityList
        columns={columns}
        data={categories}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
