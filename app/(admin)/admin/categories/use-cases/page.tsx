import { Metadata } from "next"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns } from "./columns"
import {
  getUseCases,
  getUseCasesCount,
} from "@/actions/admin/categories/actions"
import { resolvePagination } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Use Cases",
  description: "Manage functional use-cases in the admin panel",
}

type SearchParams = {
  page?: string | string[]
  limit?: string | string[]
}

export default async function UseCasePage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const { pageSize, skip, take } = resolvePagination(searchParams)

  const [useCases, totalUseCases] = await Promise.all([
    getUseCases({ skip, take }),
    getUseCasesCount(),
  ])

  const pageCount = Math.max(Math.ceil(totalUseCases / pageSize), 1)

  return (
    <ListPageWrapper
      title="Use Cases"
      addLink="/admin/categories/use-cases/add"
    >
      <EntityList
        columns={columns}
        data={useCases}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}
